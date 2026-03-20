import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import type { Json } from "@/types/database";
import { rateLimit } from "@/lib/rate-limit";

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

  const rl = rateLimit(`integrations:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { provider, apiKey, email, emailAccountId } = rawBody as {
    provider: string;
    apiKey?: string;
    email?: string;
    emailAccountId?: string;
  };

  if (!provider || !["apollo", "sendgrid"].includes(provider)) {
    return NextResponse.json(
      { error: "Invalid provider. Must be 'apollo' or 'sendgrid'" },
      { status: 400 }
    );
  }

  const credentials: Record<string, string | undefined> = {};
  if (apiKey) {
    credentials.api_key = encrypt(apiKey);
  }
  if (email) {
    credentials.email = email;
  }
  if (emailAccountId) {
    credentials.email_account_id = emailAccountId;
  }

  const credentialsJson: Json = Object.fromEntries(
    Object.entries(credentials).filter(([, v]) => v !== undefined)
  );

  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .single();

  let dbError;
  if (existing) {
    const updateData: { is_active: boolean; credentials?: Json } = {
      is_active: true,
    };
    if (Object.keys(credentialsJson).length > 0) {
      const { data: current } = await supabase
        .from("integrations")
        .select("credentials")
        .eq("id", existing.id)
        .single();

      const currentCreds = (current?.credentials as Record<string, Json>) || {};
      updateData.credentials = { ...currentCreds, ...credentialsJson };
    }

    const { error: updateError } = await supabase
      .from("integrations")
      .update(updateData)
      .eq("id", existing.id);
    dbError = updateError;
  } else {
    const { error: insertError } = await supabase.from("integrations").insert({
      user_id: user.id,
      provider,
      credentials: credentialsJson,
      is_active: true,
    });
    dbError = insertError;
  }

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to save integration" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    provider,
    is_active: true,
  });
}

export async function DELETE(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`integrations:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { provider } = rawBody as { provider: string };

  if (!provider || !["apollo", "sendgrid"].includes(provider)) {
    return NextResponse.json(
      { error: "Invalid provider. Must be 'apollo' or 'sendgrid'" },
      { status: 400 }
    );
  }

  const { error: dbError } = await supabase
    .from("integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
