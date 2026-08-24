import { NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/serverAuth";
import { isGoogleCalendarConnected } from "@/lib/googleCalendar";

export async function GET() {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ connected: false });
  const connected = await isGoogleCalendarConnected(userId);
  return NextResponse.json({ connected });
}
