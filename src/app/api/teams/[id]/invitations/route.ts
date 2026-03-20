import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

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

async function checkTeamAdminAccess(supabase: Awaited<ReturnType<typeof createClient>>, teamId: string, userId: string) {
  const { data: team } = await supabase
    .from("teams")
    .select("id, owner_id")
    .eq("id", teamId)
    .single();

  if (!team) {
    return { hasAccess: false };
  }

  if (team.owner_id === userId) {
    return { hasAccess: true };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  return {
    hasAccess: membership?.role === "owner" || membership?.role === "admin",
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
  const { hasAccess } = await checkTeamAdminAccess(supabase, id, user.id);

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: invitations, error: dbError } = await supabase
    .from("team_invitations")
    .select(`
      *,
      inviter:profiles!team_invitations_invited_by_fkey(id, full_name)
    `)
    .eq("team_id", id)
    .is("accepted_at", null);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }

  return NextResponse.json({ invitations });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = await params;
  const { hasAccess } = await checkTeamAdminAccess(supabase, id, user.id);

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, role } = rawBody as { email: string; role?: string };

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  const validRole: "admin" | "member" | "viewer" = ["admin", "member", "viewer"].includes(role ?? "") 
    ? (role as "admin" | "member" | "viewer")
    : "member";

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: createError } = await supabase
    .from("team_invitations")
    .insert({
      team_id: id,
      email: email.toLowerCase(),
      role: validRole,
      invited_by: user.id,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (createError) {
    if (createError.code === "23505") {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ invitation }, { status: 201 });
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
  const { hasAccess } = await checkTeamAdminAccess(supabase, id, user.id);

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { invitationId } = rawBody as { invitationId: string };

  if (!invitationId) {
    return NextResponse.json(
      { error: "invitationId is required" },
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase
    .from("team_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("team_id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete invitation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
