import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Use the configured app URL instead of the request origin to prevent
  // open-redirect attacks where a spoofed Host header could redirect users
  // to a malicious site.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${appUrl}/dashboard`);
    }
  }

  // If there's no code or an error, redirect to login
  return NextResponse.redirect(`${appUrl}/login`);
}
