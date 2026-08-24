import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/serverAuth";
import { getGoogleCalendarAuthUrl } from "@/lib/googleCalendar";

// Starts the app's own Google Calendar OAuth flow — separate from Supabase's
// Google sign-in — so it ends up holding a refresh token it can use later,
// server-side, at booking time.
export async function GET(request: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/calendar-builder?google_calendar=error", request.url));
  }

  const redirectUri = `${request.nextUrl.origin}/api/auth/google-calendar/callback`;
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(getGoogleCalendarAuthUrl(redirectUri, state));
  response.cookies.set("google_calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}
