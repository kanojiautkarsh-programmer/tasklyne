import type { AIProvider, StreamEvent } from "@/types/ai";
import { createModelFromConfig } from "@/lib/ai/router";
import { createResearchGraph } from "./graph";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResearchTaskParams {
  taskId: string;
  userId: string;
  researchType: "market_analysis" | "competitor" | "sentiment";
  query: string;
  provider: AIProvider;
  apiKey: string;
}

// ---------------------------------------------------------------------------
// executeResearchTask — runs to completion and returns the final report
// ---------------------------------------------------------------------------

export async function executeResearchTask(params: ResearchTaskParams) {
  const { taskId, researchType, query, provider, apiKey } = params;

  const supabase = await createClient();

  // Update task status to running
  await supabase
    .from("tasks")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", taskId);

  try {
    const model = createModelFromConfig({ provider, apiKey });
    const graph = createResearchGraph(model);

    const result = await graph.invoke({
      researchType,
      query,
      messages: [],
      searchResults: [],
      analysis: null,
      report: null,
      status: "started",
    });

    const report = result.report;

    // Extract source URLs from search results for the sources column
    const sources = (result.searchResults ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.result?.results)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((r: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r.result.results as any[]).map((sr: any) => ({
          title: sr.title,
          url: sr.url,
        })),
      );

    // Persist the report
    await supabase.from("research_reports").insert({
      task_id: taskId,
      report_type: researchType,
      content: report,
      sources,
    });

    // Mark task as completed
    await supabase
      .from("tasks")
      .update({
        status: "completed",
        output: report,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    return report;
  } catch (error) {
    // Mark task as failed
    await supabase
      .from("tasks")
      .update({
        status: "failed",
        output: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    throw error;
  }
}

// ---------------------------------------------------------------------------
// streamResearchTask — yields StreamEvent objects as the graph runs
// ---------------------------------------------------------------------------

export async function* streamResearchTask(
  params: ResearchTaskParams,
): AsyncGenerator<StreamEvent> {
  const { taskId, researchType, query, provider, apiKey } = params;

  const supabase = await createClient();

  // Update task status to running
  await supabase
    .from("tasks")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", taskId);

  try {
    const model = createModelFromConfig({ provider, apiKey });
    const graph = createResearchGraph(model);

    yield { type: "status", data: { status: "started", node: null } };

    const stream = await graph.stream(
      {
        researchType,
        query,
        messages: [],
        searchResults: [],
        analysis: null,
        report: null,
        status: "started",
      },
      { streamMode: "updates" },
    );

    // Track report and search results from stream events for persistence
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedReport: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedSearchResults: any[] = [];

    for await (const chunk of stream) {
      // Each chunk is an object keyed by node name with that node's state updates
      for (const [nodeName, update] of Object.entries(chunk)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodeUpdate = update as Record<string, any>;

        yield {
          type: "status",
          data: { status: `node_${nodeName}_complete`, node: nodeName },
        };

        // Stream message content if present
        if (nodeUpdate.messages && Array.isArray(nodeUpdate.messages)) {
          for (const msg of nodeUpdate.messages) {
            const content =
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content);
            if (content) {
              yield { type: "token", data: { node: nodeName, content } };
            }
          }
        }

        // Capture and stream tool call info
        if (nodeUpdate.searchResults && Array.isArray(nodeUpdate.searchResults)) {
          capturedSearchResults = capturedSearchResults.concat(nodeUpdate.searchResults);
          for (const result of nodeUpdate.searchResults) {
            yield {
              type: "tool_result",
              data: {
                tool: result.tool,
                args: result.args,
                hasError: !!result.error,
              },
            };
          }
        }

        // Capture and stream the final report
        if (nodeUpdate.report) {
          capturedReport = nodeUpdate.report;
          yield { type: "tool_result", data: { report: nodeUpdate.report } };
        }
      }
    }

    // Persist the report to research_reports (mirrors non-streaming executor)
    if (capturedReport) {
      const sources = capturedSearchResults
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r: any) => r.result?.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .flatMap((r: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r.result.results as any[]).map((sr: any) => ({
            title: sr.title,
            url: sr.url,
          })),
        );

      await supabase.from("research_reports").insert({
        task_id: taskId,
        report_type: researchType,
        content: capturedReport,
        sources,
      });
    }

    // Mark task as completed with the report as output
    await supabase
      .from("tasks")
      .update({
        status: "completed",
        output: capturedReport,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    yield { type: "done", data: { taskId } };
  } catch (error) {
    await supabase
      .from("tasks")
      .update({
        status: "failed",
        output: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    yield {
      type: "error",
      data: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
