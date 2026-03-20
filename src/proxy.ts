import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/join",
  "/share",
];

const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

const PUBLIC_API_PATHS = [
  "/api/auth/forgot-password",
  "/api/webhooks/stripe",
  "/api/team/invitation",
  "/api/auth/callback",
];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthed = !!user;
  const isVerified = !!user?.email_confirmed_at;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

  if (isPublicPath || isPublicApi) {
    if (AUTH_PATHS.includes(pathname) && isAuthed) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
    return response;
  }

  if (!isAuthed) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (!isVerified && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/verify", request.url));
  }

  if (pathname.startsWith("/api/") && !isPublicApi && !isVerified) {
    return NextResponse.json({ error: "Email not verified." }, { status: 403 });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
