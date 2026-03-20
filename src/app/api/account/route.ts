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

export async function DELETE(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`account:${user.id}`, GENERAL_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { confirmation } = rawBody as { confirmation: string };

  if (confirmation !== "DELETE") {
    return NextResponse.json(
      { error: 'Please type "DELETE" to confirm account deletion' },
      { status: 400 }
    );
  }

  try {
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      return NextResponse.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const { count: taskCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: teamCount } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    email: user.email,
    subscriptionTier: profile?.subscription_tier,
    hasStripeSubscription: !!profile?.stripe_customer_id,
    taskCount,
    teamCount,
  });
}
