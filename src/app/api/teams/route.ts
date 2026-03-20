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

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { data: teams, error: dbError } = await supabase
    .from("teams")
    .select(`
      *,
      owner:profiles!teams_owner_id_fkey(id, full_name),
      team_members(count)
    `)
    .eq("owner_id", user.id);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select(`
      *,
      team:teams(*)
    `)
    .eq("user_id", user.id);

  const allTeams = [
    ...(teams ?? []),
    ...(memberships?.map((m) => m.team).filter((t) => t !== null) ?? []),
  ];

  return NextResponse.json({ teams: allTeams });
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

  const { name } = rawBody as { name: string };

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Team name must be at least 2 characters" },
      { status: 400 }
    );
  }

  const { data: team, error: createError } = await supabase
    .from("teams")
    .insert({
      name: name.trim(),
      owner_id: user.id,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }

  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    role: "owner",
  });

  await supabase
    .from("profiles")
    .update({ current_team_id: team.id })
    .eq("id", user.id);

  return NextResponse.json({ team }, { status: 201 });
}
