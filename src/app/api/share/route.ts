import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase, error: "Unauthorized" };
  }

  return { user, supabase, error: null };
}

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`share:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { taskId, reportId, isPublic, expiresInDays } = rawBody as {
    taskId?: string;
    reportId?: string;
    isPublic?: boolean;
    expiresInDays?: number;
  };

  if (!taskId && !reportId) {
    return NextResponse.json(
      { error: "Either taskId or reportId is required" },
      { status: 400 }
    );
  }

  let referenceId: string;
  let referenceTable: "tasks" | "research_reports";

  if (taskId) {
    referenceId = taskId;
    referenceTable = "tasks";
  } else if (reportId) {
    referenceId = reportId;
    referenceTable = "research_reports";
  } else {
    return NextResponse.json(
      { error: "Either taskId or reportId is required" },
      { status: 400 }
    );
  }

  const { data: ref } = await supabase
    .from(referenceTable)
    .select("user_id")
    .eq("id", referenceId)
    .single();

  if (!ref || "user_id" in ref === false) {
    return NextResponse.json(
      { error: "Resource not found" },
      { status: 404 }
    );
  }

  const refUserId = (ref as { user_id: string }).user_id;
  if (refUserId !== user.id) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );
  }

  const shareToken = randomBytes(16).toString("hex");
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  if (taskId) {
    const { data: existing } = await supabase
      .from("shared_tasks")
      .select("id, share_token")
      .eq("task_id", taskId)
      .single();

    if (existing) {
      await supabase
        .from("shared_tasks")
        .update({ is_public: isPublic ?? true })
        .eq("id", existing.id);

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/share/${existing.share_token}`;
      return NextResponse.json({
        shareToken: existing.share_token,
        shareUrl,
        isPublic: isPublic ?? true,
      });
    }

    const { error: createError } = await supabase.from("shared_tasks").insert({
      task_id: taskId,
      share_token: shareToken,
      is_public: isPublic ?? true,
      created_by: user.id,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    });

    if (createError) {
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/share/${shareToken}`;
    return NextResponse.json({ shareToken, shareUrl, isPublic: isPublic ?? true }, { status: 201 });
  } else {
    const reportIdStr = reportId as string;
    const { data: existing } = await supabase
      .from("shared_reports")
      .select("id, share_token")
      .eq("report_id", reportIdStr)
      .single();

    if (existing) {
      await supabase
        .from("shared_reports")
        .update({ is_public: isPublic ?? true })
        .eq("id", existing.id);

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/share/${existing.share_token}`;
      return NextResponse.json({
        shareToken: existing.share_token,
        shareUrl,
        isPublic: isPublic ?? true,
      });
    }

    const insertRecord: Record<string, unknown> = {
      report_id: reportIdStr,
      share_token: shareToken,
      is_public: isPublic ?? true,
      created_by: user.id,
    };
    if (expiresAt) {
      insertRecord.expires_at = expiresAt;
    }

    const { error: createError } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => { then: (cb: (result: { error: unknown }) => void) => void } } })
      .from("shared_reports")
      .insert(insertRecord);

    const err = createError;
    if (err) {
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 }
      );
    }

    if (createError) {
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/share/${shareToken}`;
    return NextResponse.json({ shareToken, shareUrl, isPublic: isPublic ?? true }, { status: 201 });
  }
}

export async function DELETE(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`share:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { taskId, reportId } = rawBody as {
    taskId?: string;
    reportId?: string;
  };

  if (!taskId && !reportId) {
    return NextResponse.json(
      { error: "Either taskId or reportId is required" },
      { status: 400 }
    );
  }

  if (taskId) {
    const { error: deleteError } = await supabase
      .from("shared_tasks")
      .delete()
      .eq("task_id", taskId)
      .eq("created_by", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete share link" },
        { status: 500 }
      );
    }
  } else if (reportId) {
    const { error: deleteError } = await supabase
      .from("shared_reports")
      .delete()
      .eq("report_id", reportId)
      .eq("created_by", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete share link" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
