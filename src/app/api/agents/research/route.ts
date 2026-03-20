import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  executeResearchTask,
  streamResearchTask,
} from "@/lib/agents/research/executor";
import { researchBodySchema } from "@/lib/validations/agents";
import { rateLimit, AGENT_RATE_LIMIT } from "@/lib/rate-limit";
import { checkTaskLimit } from "@/lib/task-limit";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 120;

// ---------------------------------------------------------------------------
// POST /api/agents/research
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`agent:${user.id}`, AGENT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = researchBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { researchType, query, provider } = parsed.data;
  let apiKey = parsed.data.apiKey;

  const limitResult = await checkTaskLimit(supabase, user.id);
  if (!limitResult.allowed) {
    return NextResponse.json({ error: limitResult.message }, { status: 429 });
  }

  if (!apiKey) {
    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("encrypted_key")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("is_valid", true)
      .limit(1)
      .single();

    if (!keyRow) {
      return NextResponse.json(
        { error: `No valid API key found for provider "${provider}". Please provide an apiKey or store one in your account settings.` },
        { status: 400 },
      );
    }

    try {
      apiKey = decrypt(keyRow.encrypted_key);
    } catch {
      apiKey = keyRow.encrypted_key;
    }
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      agent_type: "research" as const,
      title: `${researchType.replace("_", " ")} — ${query.slice(0, 80)}`,
      description: query,
      status: "pending" as const,
      input_params: { researchType, query, provider },
    })
    .select("id")
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Failed to create task record" }, { status: 500 });
  }

  const taskId = task.id;

  const taskParams = {
    taskId,
    userId: user.id,
    researchType: researchType as "market_analysis" | "competitor" | "sentiment",
    query,
    provider,
    apiKey,
  };

  const acceptsSSE = request.headers.get("accept")?.includes("text/event-stream");

  if (acceptsSSE) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamResearchTask(taskParams)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", data: error instanceof Error ? error.message : "Unknown error" })}\n\n`),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const report = await executeResearchTask(taskParams);
    return NextResponse.json({ taskId, status: "completed", report });
  } catch (error) {
    return NextResponse.json(
      { taskId, status: "failed", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
