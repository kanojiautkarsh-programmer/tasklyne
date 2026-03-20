/**
 * Growth Agent – API Route
 *
 * POST /api/agents/growth
 *
 * Accepts a campaign request, authenticates the user, and either
 * returns the result as JSON or streams progress via SSE.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AIProvider } from "@/types/ai";
import type { StreamEvent } from "@/types/ai";
import {
  executeGrowthTask,
  streamGrowthTask,
} from "@/lib/agents/growth/executor";
import { growthBodySchema } from "@/lib/validations/agents";
import { rateLimit, AGENT_RATE_LIMIT } from "@/lib/rate-limit";
import { checkTaskLimit } from "@/lib/task-limit";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 120; // allow long-running generations on Vercel

export async function POST(request: NextRequest) {
  // -----------------------------------------------------------------------
  // 1. Authenticate
  // -----------------------------------------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // -----------------------------------------------------------------------
  // 2. Rate limit
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // 3. Parse & validate body
  // -----------------------------------------------------------------------
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = growthBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    campaignType,
    input,
    provider,
    apolloApiKey,
    sendNow,
    stream,
  } = parsed.data;
  let apiKey = parsed.data.apiKey;

  // -----------------------------------------------------------------------
  // 4. Task limit check
  // -----------------------------------------------------------------------
  const limitResult = await checkTaskLimit(supabase, user.id);
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: limitResult.message },
      { status: 429 },
    );
  }

  // -----------------------------------------------------------------------
  // 5. Resolve API key (fall back to stored key, just like research/build)
  // -----------------------------------------------------------------------
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
        {
          error: `No valid API key found for provider "${provider}". Please provide an apiKey or store one in your account settings.`,
        },
        { status: 400 },
      );
    }

    try {
      apiKey = decrypt(keyRow.encrypted_key);
    } catch {
      apiKey = keyRow.encrypted_key;
    }
  }

  // -----------------------------------------------------------------------
  // 6. Create task record (same pattern as research/build routes)
  // -----------------------------------------------------------------------
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      agent_type: "growth" as const,
      title: `Growth – ${campaignType}`,
      description: `Automated ${campaignType} campaign`,
      status: "pending" as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input_params: input as any,
    })
    .select("id")
    .single();

  if (taskError || !task) {
    return NextResponse.json(
      { error: "Failed to create task record" },
      { status: 500 },
    );
  }

  const taskId = task.id;

  const params = {
    taskId,
    userId: user.id,
    campaignType: campaignType as "cold_email" | "blog" | "onboarding",
    input,
    provider: provider as AIProvider,
    apiKey,
    apolloApiKey: apolloApiKey as string | undefined,
    sendNow: Boolean(sendNow),
  };

  // -----------------------------------------------------------------------
  // 7a. Streaming response (Accept header or body `stream` field)
  // -----------------------------------------------------------------------
  const wantsStream =
    stream || request.headers.get("accept")?.includes("text/event-stream");

  if (wantsStream) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamGrowthTask(params)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errorEvent: StreamEvent = {
            type: "error",
            data:
              error instanceof Error ? error.message : "Unknown error",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
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

  // -----------------------------------------------------------------------
  // 7b. Non-streaming response
  // -----------------------------------------------------------------------
  try {
    const result = await executeGrowthTask(params);

    return NextResponse.json({
      taskId,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Growth agent failed";
    return NextResponse.json(
      { error: message, taskId },
      { status: 500 },
    );
  }
}
