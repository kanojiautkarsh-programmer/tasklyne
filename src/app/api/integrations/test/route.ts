import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

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

  const { provider } = rawBody as { provider: string };

  if (!provider || !["apollo", "sendgrid"].includes(provider)) {
    return NextResponse.json(
      { error: "Invalid provider. Must be 'apollo' or 'sendgrid'" },
      { status: 400 }
    );
  }

  const { data: integration, error: fetchError } = await supabase
    .from("integrations")
    .select("credentials, is_active")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .single();

  if (fetchError || !integration) {
    return NextResponse.json(
      { valid: false, message: `${provider} integration not found` },
      { status: 404 }
    );
  }

  if (!integration.is_active) {
    return NextResponse.json({
      valid: false,
      message: `${provider} integration is not active`,
    });
  }

  const credentials = integration.credentials as {
    api_key?: string;
    email?: string;
  };

  if (!credentials?.api_key) {
    return NextResponse.json({
      valid: false,
      message: `${provider} API key not configured`,
    });
  }

  try {
    const decryptedApiKey = decrypt(credentials.api_key);

    if (provider === "apollo") {
      const response = await fetch("https://api.apollo.io/v1/health_check", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${decryptedApiKey}`,
        },
      });

      if (response.ok) {
        return NextResponse.json({
          valid: true,
          message: "Apollo connection successful",
        });
      } else {
        return NextResponse.json({
          valid: false,
          message: "Apollo API key is invalid or expired",
        });
      }
    }

    if (provider === "sendgrid") {
      const response = await fetch(
        "https://api.sendgrid.com/v3/user/profile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${decryptedApiKey}`,
          },
        }
      );

      if (response.ok) {
        return NextResponse.json({
          valid: true,
          message: "SendGrid connection successful",
        });
      } else {
        return NextResponse.json({
          valid: false,
          message: "SendGrid API key is invalid or expired",
        });
      }
    }
  } catch {
    return NextResponse.json({
      valid: false,
      message: `Failed to validate ${provider} connection`,
    });
  }

  return NextResponse.json({
    valid: false,
    message: "Unknown error occurred",
  });
}
