import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeBuildTask, streamBuildTask } from "@/lib/agents/build/executor";
import type { StreamEvent } from "@/types/ai";
import { buildBodySchema } from "@/lib/validations/agents";
import { rateLimit, AGENT_RATE_LIMIT } from "@/lib/rate-limit";
import { checkTaskLimit } from "@/lib/task-limit";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 120; // allow long-running generations on Vercel

// ---------------------------------------------------------------------------
// POST /api/agents/build
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // ---- Auth ----
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- Rate limit ----
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

    // ---- Parse & validate body ----
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = buildBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }

    const { artifactType, productIdea, context, provider } = parsed.data;
    let apiKey = parsed.data.apiKey;

    // ---- Task limit check ----
    const limitResult = await checkTaskLimit(supabase, user.id);
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.message },
        { status: 429 },
      );
    }

    // ---- Resolve API key ----
    if (!apiKey) {
      const { data: keyRow } = await supabase
        .from("api_keys")
        .select("encrypted_key")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("is_valid", true)
        .single();

      if (!keyRow?.encrypted_key) {
        return NextResponse.json(
          { error: `No valid API key found for provider "${provider}". Please provide one or save it in settings.` },
          { status: 400 },
        );
      }

      try {
        apiKey = decrypt(keyRow.encrypted_key);
      } catch {
        apiKey = keyRow.encrypted_key;
      }
    }

    // ---- Create task record ----
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        agent_type: "build" as const,
        title: `Build: ${artifactType}`,
        description: productIdea.slice(0, 500),
        status: "pending" as const,
        input_params: { artifactType, productIdea, context, provider },
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

    // ---- Determine response mode ----
    const wantsStream = request.headers.get("accept")?.includes("text/event-stream");

    if (wantsStream) {
      // SSE streaming response — build our own ReadableStream (same pattern
      // as research & growth routes) to avoid double-wrapping via
      // createStreamResponse which adds an extra { type: "token" } envelope.
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of streamBuildTask({
              taskId,
              userId: user.id,
              artifactType,
              productIdea: productIdea.trim(),
              context: context?.trim(),
              provider,
              apiKey,
            })) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            const errorEvent: StreamEvent = {
              type: "error",
              data: error instanceof Error ? error.message : "Unknown error",
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

    // ---- Non-streaming response ----
    const artifact = await executeBuildTask({
      taskId,
      userId: user.id,
      artifactType,
      productIdea: productIdea.trim(),
      context: context?.trim(),
      provider,
      apiKey,
    });

    return NextResponse.json({
      taskId,
      artifactType,
      artifact,
    });
  } catch (error) {
    console.error("[Build Agent] Unhandled error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
