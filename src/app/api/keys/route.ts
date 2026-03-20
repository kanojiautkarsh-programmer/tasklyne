import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/ai/router";
import { encrypt, decrypt } from "@/lib/crypto";
import { rateLimit, KEYS_RATE_LIMIT } from "@/lib/rate-limit";
import { saveKeyBodySchema, deleteKeyBodySchema } from "@/lib/validations/agents";

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

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

  // Rate limit
  const rl = rateLimit(`keys:${user.id}`, KEYS_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  const { data: keys, error: dbError } = await supabase
    .from("api_keys")
    .select("id, provider, encrypted_key, is_valid, created_at")
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 },
    );
  }

  const maskedKeys = (keys ?? []).map((key) => {
    let plainKey: string;
    try {
      plainKey = decrypt(key.encrypted_key);
    } catch {
      // Fallback for keys stored before encryption was added
      plainKey = key.encrypted_key;
    }
    return {
      id: key.id,
      provider: key.provider,
      maskedKey: maskKey(plainKey),
      isValid: key.is_valid,
      createdAt: key.created_at,
    };
  });

  return NextResponse.json({ keys: maskedKeys });
}

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  // Rate limit
  const rl = rateLimit(`keys:${user.id}`, KEYS_RATE_LIMIT);
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

  const parsed = saveKeyBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { provider, apiKey } = parsed.data;

  let isValid = false;
  let validationError: string | null = null;
  try {
    isValid = await validateApiKey(provider, apiKey);
  } catch (err) {
    validationError = err instanceof Error ? err.message : "Unknown validation error";
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json(
      { error: `API key validation failed${validationError ? `: ${validationError}` : "."} Please check your key and try again.` },
      { status: 400 },
    );
  }

  // Encrypt before storing
  const encryptedValue = encrypt(apiKey);

  // Upsert: update if provider key exists for this user, otherwise insert
  const { data: existing } = await supabase
    .from("api_keys")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .single();

  let dbError;
  if (existing) {
    const { error: updateError } = await supabase
      .from("api_keys")
      .update({ encrypted_key: encryptedValue, is_valid: isValid })
      .eq("id", existing.id);
    dbError = updateError;
  } else {
    const { error: insertError } = await supabase.from("api_keys").insert({
      user_id: user.id,
      provider,
      encrypted_key: encryptedValue,
      is_valid: isValid,
    });
    dbError = insertError;
  }

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    provider,
    maskedKey: maskKey(apiKey),
    isValid,
  });
}

export async function DELETE(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  // Rate limit
  const rl = rateLimit(`keys:${user.id}`, KEYS_RATE_LIMIT);
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

  const parsed = deleteKeyBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { provider } = parsed.data;

  const { error: dbError } = await supabase
    .from("api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
