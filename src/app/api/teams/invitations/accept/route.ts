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

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token } = rawBody as { token: string };

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  const { data: invitation, error: fetchError } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !invitation) {
    return NextResponse.json(
      { error: "Invalid invitation" },
      { status: 404 }
    );
  }

  if (invitation.accepted_at) {
    return NextResponse.json(
      { error: "Invitation has already been accepted" },
      { status: 400 }
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Invitation has expired" },
      { status: 400 }
    );
  }

  if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address" },
      { status: 403 }
    );
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: invitation.team_id,
    user_id: user.id,
    role: invitation.role,
    invited_by: invitation.invited_by,
  });

  if (memberError) {
    if (memberError.code === "23505") {
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to join team" },
      { status: 500 }
    );
  }

  await supabase
    .from("team_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  await supabase
    .from("profiles")
    .update({ current_team_id: invitation.team_id })
    .eq("id", user.id);

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", invitation.team_id)
    .single();

  return NextResponse.json({
    success: true,
    team,
  });
}
