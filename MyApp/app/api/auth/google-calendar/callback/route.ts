import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/serverAuth";
import { saveGoogleCalendarConnection } from "@/lib/googleCalendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("google_calendar_oauth_state")?.value;

  const redirectTo = new URL("/calendar-builder", request.url);
  const finish = (status: "connected" | "error") => {
    redirectTo.searchParams.set("google_calendar", status);
    const response = NextResponse.redirect(redirectTo);
    response.cookies.delete("google_calendar_oauth_state");
    return response;
  };

  if (!code || !state || !expectedState || state !== expectedState) {
    return finish("error");
  }

  const userId = await getVerifiedUserId();
  if (!userId) return finish("error");

  const redirectUri = `${request.nextUrl.origin}/api/auth/google-calendar/callback`;
  const ok = await saveGoogleCalendarConnection(userId, code, redirectUri);
  return finish(ok ? "connected" : "error");
}
