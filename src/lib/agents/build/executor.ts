import { createModelFromConfig } from "@/lib/ai/router";
import { createClient } from "@/lib/supabase/server";
import { createBuildGraph } from "./graph";
import type { AIProvider, StreamEvent } from "@/types/ai";
import type { BuildStateType } from "./graph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildTaskParams {
  taskId: string;
  userId: string;
  artifactType: "prd" | "feature_spec" | "user_stories" | "tech_stack";
  productIdea: string;
  context?: string;
  provider: AIProvider;
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateTaskStatus(
  taskId: string,
  status: "pending" | "running" | "completed" | "failed",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output?: Record<string, any>,
) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (output !== undefined) {
    update.output = output;
  }
  await supabase.from("tasks").update(update).eq("id", taskId);
}

async function saveBuildArtifact(
  taskId: string,
  artifactType: BuildTaskParams["artifactType"],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any,
) {
  const supabase = await createClient();
  await supabase.from("build_artifacts").insert({
    task_id: taskId,
    artifact_type: artifactType,
    content,
  });
}

// ---------------------------------------------------------------------------
// Non-streaming executor
// ---------------------------------------------------------------------------

export async function executeBuildTask(params: BuildTaskParams) {
  const { taskId, artifactType, productIdea, context, provider, apiKey } = params;

  try {
    await updateTaskStatus(taskId, "running");

    const model = createModelFromConfig({ provider, apiKey });
    const graph = createBuildGraph(model);

    const initialState: BuildStateType = {
      messages: [],
      artifactType,
      productIdea,
      context: context ?? "",
      artifact: null,
      feedback: "",
      status: "pending",
    };

    const result = await graph.invoke(initialState);

    const artifact = result.artifact;

    // Persist
    await saveBuildArtifact(taskId, artifactType, artifact);
    await updateTaskStatus(taskId, "completed", { artifact });

    return artifact;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateTaskStatus(taskId, "failed", { error: message });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Streaming executor
// ---------------------------------------------------------------------------

export async function* streamBuildTask(
  params: BuildTaskParams,
): AsyncGenerator<StreamEvent> {
  const { taskId, artifactType, productIdea, context, provider, apiKey } = params;

  try {
    await updateTaskStatus(taskId, "running");

    yield { type: "status", data: "starting" };

    const model = createModelFromConfig({ provider, apiKey });
    const graph = createBuildGraph(model);

    const initialState: BuildStateType = {
      messages: [],
      artifactType,
      productIdea,
      context: context ?? "",
      artifact: null,
      feedback: "",
      status: "pending",
    };

    // Stream graph execution events
    const stream = await graph.stream(initialState, {
      streamMode: "updates",
    });

    // Track the artifact from stream events instead of re-invoking the graph
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedArtifact: any = null;

    for await (const event of stream) {
      // Each event is keyed by node name with its partial state update
      for (const [nodeName, update] of Object.entries(event)) {
        const nodeUpdate = update as Partial<BuildStateType>;

        yield {
          type: "status",
          data: `node:${nodeName}`,
        };

        // If the node produced an artifact, capture and stream it
        if (nodeUpdate.artifact) {
          capturedArtifact = nodeUpdate.artifact;
          yield {
            type: "tool_result",
            data: {
              node: nodeName,
              artifact: nodeUpdate.artifact,
            },
          };
        }

        // Stream status updates
        if (nodeUpdate.status) {
          yield {
            type: "status",
            data: nodeUpdate.status,
          };
        }
      }
    }

    // Persist the artifact captured from the stream
    await saveBuildArtifact(taskId, artifactType, capturedArtifact);
    await updateTaskStatus(taskId, "completed", { artifact: capturedArtifact });

    yield { type: "done", data: { artifact: capturedArtifact } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateTaskStatus(taskId, "failed", { error: message });
    yield { type: "error", data: message };
  }
}
