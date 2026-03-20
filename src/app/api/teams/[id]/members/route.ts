import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

async function checkTeamAccess(supabase: Awaited<ReturnType<typeof createClient>>, teamId: string, userId: string) {
  const { data: team } = await supabase
    .from("teams")
    .select("id, owner_id")
    .eq("id", teamId)
    .single();

  if (!team) {
    return { hasAccess: false, isAdmin: false };
  }

  if (team.owner_id === userId) {
    return { hasAccess: true, isAdmin: true };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  return {
    hasAccess: !!membership,
    isAdmin: membership?.role === "owner" || membership?.role === "admin",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = await params;
  const { hasAccess } = await checkTeamAccess(supabase, id, user.id);

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: members, error: dbError } = await supabase
    .from("team_members")
    .select(`
      *,
      user:profiles!team_members_user_id_fkey(id, full_name)
    `)
    .eq("team_id", id);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }

  return NextResponse.json({ members });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { memberId, userId } = rawBody as { memberId?: string; userId?: string };

  if (!memberId && !userId) {
    return NextResponse.json(
      { error: "Either memberId or userId is required" },
      { status: 400 }
    );
  }

  const { hasAccess } = await checkTeamAccess(supabase, id, user.id);

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "Cannot remove yourself. Transfer ownership first." },
      { status: 400 }
    );
  }

  let query = supabase.from("team_members").delete().eq("team_id", id);

  if (memberId) {
    query = query.eq("id", memberId);
  } else if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error: deleteError } = await query;

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { memberId, role } = rawBody as { memberId: string; role: string };

  if (!memberId || !role) {
    return NextResponse.json(
      { error: "memberId and role are required" },
      { status: 400 }
    );
  }

  if (!["admin", "member", "viewer"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role" },
      { status: 400 }
    );
  }

  const { hasAccess } = await checkTeamAccess(supabase, id, user.id);

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("team_members")
    .update({ role: role as "admin" | "member" | "viewer" })
    .eq("id", memberId)
    .eq("team_id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
