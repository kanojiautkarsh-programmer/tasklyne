import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

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

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`notifications:${user.id}`, GENERAL_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "20");
  const unreadOnly = searchParams.get("unread") === "true";

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data: notifications, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({
    notifications,
    unreadCount: count ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`notifications:${user.id}`, GENERAL_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { type, title, message, link } = rawBody as {
    type: string;
    title: string;
    message?: string;
    link?: string;
  };

  const validTypes = ["task_completed", "task_failed", "team_invite", "billing", "system"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: "Invalid notification type" },
      { status: 400 }
    );
  }

  const { error: createError } = await supabase.from("notifications").insert({
    user_id: user.id,
    type,
    title,
    message,
    link,
  });

  if (createError) {
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`notifications:${user.id}`, GENERAL_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { notificationId, markAllRead } = rawBody as {
    notificationId?: string;
    markAllRead?: boolean;
  };

  if (markAllRead) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to mark notifications as read" },
        { status: 500 }
      );
    }
  } else if (notificationId) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`notifications:${user.id}`, GENERAL_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { notificationId, deleteAll } = rawBody as {
    notificationId?: string;
    deleteAll?: boolean;
  };

  if (deleteAll) {
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("is_read", true);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete notifications" },
        { status: 500 }
      );
    }
  } else if (notificationId) {
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete notification" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
