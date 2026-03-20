import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, AGENT_RATE_LIMIT } from "@/lib/rate-limit";
import { checkTaskLimit } from "@/lib/task-limit";
import { taskCreateSchema } from "@/lib/validations/agents";

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

  const parsed = taskCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const limitResult = await checkTaskLimit(supabase, user.id);
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: limitResult.message },
      { status: 429 },
    );
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      agent_type: parsed.data.agentType,
      title: parsed.data.name,
      description: parsed.data.goal,
      status: "pending",
      input_params: {},
    })
    .select("id")
    .single();

  if (taskError || !task) {
    return NextResponse.json(
      { error: "Failed to create task record" },
      { status: 500 },
    );
  }

  return NextResponse.json({ taskId: task.id, agentType: parsed.data.agentType }, { status: 201 });
}
