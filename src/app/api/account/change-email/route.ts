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

export async function POST(request: NextRequest) {
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

  const { newEmail } = rawBody as { newEmail: string };

  if (!newEmail || !newEmail.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  if (newEmail.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "New email is the same as current email" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (updateError) {
    if (updateError.message.includes("already")) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Verification email sent. Please check your new email to confirm.",
  });
}
