import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("team_invitations")
    .select(`
      id,
      team_id,
      email,
      role,
      expires_at,
      accepted_at,
      created_at,
      teams:team_id (
        name
      ),
      profiles:invited_by (
        full_name,
        email
      )
    `)
    .eq("token", token)
    .single();

  if (error || !invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
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

  const team = invitation.teams as unknown as { name: string } | null;
  const inviter = invitation.profiles as unknown as { full_name: string | null; email: string | null } | null;

  return NextResponse.json({
    teamName: team?.name ?? "Unknown Team",
    role: invitation.role,
    email: invitation.email,
    invitedBy: inviter?.full_name ?? inviter?.email ?? "Team Admin",
    expiresAt: invitation.expires_at,
  });
}
