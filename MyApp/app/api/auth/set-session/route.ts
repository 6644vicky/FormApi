import { NextRequest, NextResponse } from "next/server";

// Google sign-in goes through /api/auth/callback, which sets the
// "sb-access-token"/"sb-refresh-token" cookies that Server Actions rely on
// (see lib/serverAuth.ts) to verify who's actually calling them. Email/
// password sign-in never touched that route — supabase-js just kept the
// session in the browser's own storage — so those same Server Actions had
// no cookie to check and silently treated every password-based user as
// unauthenticated. The client calls this right after signInWithPassword
// succeeds, to set the same cookies from the session it already has.
export async function POST(request: NextRequest) {
  let body: { access_token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Missing access_token or refresh_token" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };
  response.cookies.set("sb-access-token", access_token, cookieOptions);
  response.cookies.set("sb-refresh-token", refresh_token, cookieOptions);

  return response;
}
