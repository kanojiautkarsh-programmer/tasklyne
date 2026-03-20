/**
 * Growth Agent - Executor
 *
 * Orchestrates graph execution, database persistence, and optional
 * email delivery via Apollo or SendGrid.
 */

import type { AIProvider } from "@/types/ai";
import type { StreamEvent } from "@/types/ai";
import { createModelFromConfig } from "@/lib/ai/router";
import { createClient } from "@/lib/supabase/server";
import { createGrowthGraph } from "./graph";
import type { GrowthStateType } from "./graph";
import { sendEmailApollo, sendEmailSendGrid } from "./integrations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GrowthTaskParams {
  taskId: string;
  userId: string;
  campaignType: "cold_email" | "blog" | "onboarding";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>;
  provider: AIProvider;
  apiKey: string;
  apolloApiKey?: string;
  sendNow?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateTaskRecord(
  taskId: string,
  status: "completed" | "failed",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: Record<string, any> | null,
  tokensUsed = 0,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: output as any,
      tokens_used: tokensUsed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
  if (error) {
    console.error("[growth/executor] Failed to update task:", error.message);
  }
}

async function saveCampaign(
  taskId: string,
  campaignType: GrowthTaskParams["campaignType"],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipients: any[] | null,
  status: "draft" | "sent",
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      task_id: taskId,
      campaign_type: campaignType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: content as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recipients: (recipients ?? null) as any,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[growth/executor] Failed to save campaign:", error.message);
    return null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Email delivery
// ---------------------------------------------------------------------------

async function deliverEmails(
  params: GrowthTaskParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leads: any[],
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emails: any[] = Array.isArray(content) ? content : [];
  if (emails.length === 0) return { sent, failed };

  // Only send the intro (first) email in the sequence for now
  const introEmail = emails[0];
  if (!introEmail) return { sent, failed };

  const targets =
    leads.length > 0
      ? leads
      : params.input.leads ?? params.input.recipients ?? [];

  for (const lead of targets) {
    const to = lead.email ?? lead.to;
    if (!to) {
      failed++;
      continue;
    }

    let success = false;

    // Prefer Apollo if key + email account is available
    if (params.apolloApiKey && params.input.emailAccountId) {
      success = await sendEmailApollo({
        apolloApiKey: params.apolloApiKey,
        emailAccountId: params.input.emailAccountId as string,
        to,
        subject: introEmail.subject,
        body: introEmail.body,
      });
    }

    // Fall back to SendGrid
    if (!success) {
      success = await sendEmailSendGrid({
        to,
        subject: introEmail.subject,
        body: introEmail.body,
        fromEmail: params.input.fromEmail as string | undefined,
      });
    }

    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Execute (non-streaming)
// ---------------------------------------------------------------------------

/**
 * Run the Growth Agent graph to completion and persist results.
 */
export async function executeGrowthTask(params: GrowthTaskParams) {
  const { taskId, userId, campaignType, input, provider, apiKey, apolloApiKey, sendNow } =
    params;
  void userId;

  // 1. Mark task as running (task record already created by the API route)
  {
    const supabase = await createClient();
    await supabase
      .from("tasks")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", taskId);
  }

  try {
    // 2. Create model via BYOK router
    const model = createModelFromConfig({ provider, apiKey });

    // 3. Build & invoke the graph
    const graph = createGrowthGraph(model);

    const result: GrowthStateType = await graph.invoke({
      messages: [],
      campaignType,
      input: { ...input, apolloApiKey },
      leads: input.leads ?? [],
      generatedContent: null,
      campaign: null,
      status: "pending",
    });

    // 4. Optionally send emails
    let deliveryResult: { sent: number; failed: number } | null = null;
    if (sendNow && campaignType === "cold_email") {
      deliveryResult = await deliverEmails(params, result.generatedContent, result.leads);
    }

    const campaignStatus: "draft" | "sent" =
      deliveryResult && deliveryResult.sent > 0 ? "sent" : "draft";

    // 5. Save campaign
    const campaignRecord = await saveCampaign(
      taskId,
      campaignType,
      result.generatedContent,
      result.leads.length > 0 ? result.leads : null,
      campaignStatus,
    );

    // 6. Update task as completed
    const output = {
      campaign: campaignType,
      content: result.generatedContent,
      leads: result.leads,
      delivery: deliveryResult,
      campaignId: campaignRecord?.id ?? null,
    };
    await updateTaskRecord(taskId, "completed", output);

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateTaskRecord(taskId, "failed", { error: message });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Stream (SSE-compatible async generator)
// ---------------------------------------------------------------------------

/**
 * Runs the Growth Agent graph and yields SSE-compatible StreamEvent objects
 * as progress is made through each node.
 */
export async function* streamGrowthTask(
  params: GrowthTaskParams,
): AsyncGenerator<StreamEvent> {
  const { taskId, userId, campaignType, input, provider, apiKey, apolloApiKey, sendNow } =
    params;
  void userId;

  // Mark task as running (task record already created by the API route)
  {
    const supabase = await createClient();
    await supabase
      .from("tasks")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", taskId);
  }

  try {
    const model = createModelFromConfig({ provider, apiKey });
    const graph = createGrowthGraph(model);

    yield { type: "status", data: "Starting growth agent…" };

    const stream = await graph.stream(
      {
        messages: [],
        campaignType,
        input: { ...input, apolloApiKey },
        leads: input.leads ?? [],
        generatedContent: null,
        campaign: null,
        status: "pending",
      },
      { streamMode: "updates" },
    );

    const finalState: Partial<GrowthStateType> = {};

    for await (const update of stream) {
      // `update` is a Record<nodeName, partialState>
      for (const [nodeName, nodeOutput] of Object.entries(update)) {
        const partial = nodeOutput as Partial<GrowthStateType>;

        // Merge into running final state
        if (partial.leads) finalState.leads = partial.leads;
        if (partial.generatedContent) finalState.generatedContent = partial.generatedContent;
        if (partial.campaign) finalState.campaign = partial.campaign;
        if (partial.status) finalState.status = partial.status;

        yield {
          type: "status",
          data: `[${nodeName}] ${partial.status ?? "processing"}`,
        };

        // Stream message content if available
        if (partial.messages && partial.messages.length > 0) {
          for (const msg of partial.messages) {
            const text =
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content);
            yield { type: "token", data: text };
          }
        }
      }
    }

    // Deliver emails if requested
    let deliveryResult: { sent: number; failed: number } | null = null;
    if (sendNow && campaignType === "cold_email") {
      yield { type: "status", data: "Sending emails…" };
      deliveryResult = await deliverEmails(
        params,
        finalState.generatedContent,
        finalState.leads ?? [],
      );
      yield {
        type: "tool_result",
        data: { sent: deliveryResult.sent, failed: deliveryResult.failed },
      };
    }

    const campaignStatus: "draft" | "sent" =
      deliveryResult && deliveryResult.sent > 0 ? "sent" : "draft";

    const campaignRecord = await saveCampaign(
      taskId,
      campaignType,
      finalState.generatedContent,
      (finalState.leads ?? []).length > 0 ? finalState.leads! : null,
      campaignStatus,
    );

    const output = {
      campaign: campaignType,
      content: finalState.generatedContent,
      leads: finalState.leads ?? [],
      delivery: deliveryResult,
      campaignId: campaignRecord?.id ?? null,
    };

    await updateTaskRecord(taskId, "completed", output);

    yield { type: "done", data: output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateTaskRecord(taskId, "failed", { error: message });
    yield { type: "error", data: message };
  }
}
