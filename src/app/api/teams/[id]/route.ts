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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = await params;

  const { data: team, error: fetchError } = await supabase
    .from("teams")
    .select(`
      *,
      owner:profiles!teams_owner_id_fkey(id, full_name)
    `)
    .eq("id", id)
    .single();

  if (fetchError || !team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .single();

  const isMember = team.owner_id === user.id || !!membership;

  if (!isMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: members } = await supabase
    .from("team_members")
    .select(`
      *,
      user:profiles!team_members_user_id_fkey(id, full_name)
    `)
    .eq("team_id", id);

  const { data: invitations } = await supabase
    .from("team_invitations")
    .select(`
      *,
      inviter:profiles!team_invitations_invited_by_fkey(id, full_name)
    `)
    .eq("team_id", id)
    .is("accepted_at", null);

  return NextResponse.json({
    team,
    members,
    invitations,
    userRole: team.owner_id === user.id ? "owner" : membership?.role,
  });
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

  const { data: team } = await supabase
    .from("teams")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the owner can update team settings" }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name } = rawBody as { name?: string };

  if (name && name.trim().length < 2) {
    return NextResponse.json(
      { error: "Team name must be at least 2 characters" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("teams")
    .update({ name: name?.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
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

  const { data: team } = await supabase
    .from("teams")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the owner can delete the team" }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from("teams")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
