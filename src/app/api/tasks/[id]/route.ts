import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the task to verify ownership
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, user_id")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify ownership
  if (task.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete related records first (research reports, build artifacts, campaigns)
  // These tables have foreign keys with ON DELETE CASCADE, but we can be explicit
  await supabase
    .from("research_reports")
    .delete()
    .eq("task_id", taskId);

  await supabase
    .from("build_artifacts")
    .delete()
    .eq("task_id", taskId);

  await supabase
    .from("campaigns")
    .delete()
    .eq("task_id", taskId);

  // Delete the task itself
  const { error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, taskId });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the task
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify ownership
  if (task.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ task });
}
