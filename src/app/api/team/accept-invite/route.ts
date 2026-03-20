import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token } = rawBody as { token?: string };

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invitation, error: inviteError } = await supabase
    .from("team_invitations")
    .select("id, team_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Invitation not found or invalid" },
      { status: 404 }
    );
  }

  if (invitation.accepted_at) {
    return NextResponse.json(
      { error: "This invitation has already been accepted" },
      { status: 400 }
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 400 }
    );
  }

  const userEmail = user.email?.toLowerCase();
  const inviteEmail = invitation.email.toLowerCase();

  if (userEmail !== inviteEmail) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address" },
      { status: 403 }
    );
  }

  const { error: memberError } = await supabase
    .from("team_members")
    .insert({
      team_id: invitation.team_id,
      user_id: user.id,
      role: invitation.role as "admin" | "member" | "viewer",
      invited_by: user.id,
      joined_at: new Date().toISOString(),
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

  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  if (updateError) {
    console.error("Failed to update invitation:", updateError);
  }

  await supabase
    .from("profiles")
    .update({ current_team_id: invitation.team_id })
    .eq("id", user.id);

  return NextResponse.json({
    success: true,
    message: "Successfully joined the team",
    teamId: invitation.team_id,
  });
}
