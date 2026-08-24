import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/publicEvent";
import { createGoogleMeetEvent } from "@/lib/googleCalendar";
import { parseDurationMinutes } from "@/lib/bookingTime";

// Called right after a guest's booking is saved. Best-effort: every failure
// path just returns meetingUrl: null rather than an error status, since the
// booking itself has already succeeded by the time this runs — a guest
// should never see this step fail.
export async function POST(request: NextRequest) {
  let body: { bookingId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ meetingUrl: null });
  }
  if (!body.bookingId) {
    return NextResponse.json({ meetingUrl: null });
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, event_id, guest_name, guest_email, booking_date, booking_time, guest_timezone, meeting_url")
    .eq("id", body.bookingId)
    .single();
  if (!booking || !booking.guest_timezone) {
    return NextResponse.json({ meetingUrl: null });
  }
  // Idempotent: repeat calls for the same booking (retries, or someone
  // probing bookingId values) must never create a second Calendar event.
  if (booking.meeting_url) {
    return NextResponse.json({ meetingUrl: booking.meeting_url });
  }

  const { data: event } = await supabaseAdmin
    .from("calendar_events")
    .select("user_id, meeting_link, event_title, title, description, durations")
    .eq("id", booking.event_id)
    .single();
  if (!event || event.meeting_link !== "G-meet") {
    return NextResponse.json({ meetingUrl: null });
  }

  const durationMinutes = parseDurationMinutes(event.durations?.[0]);
  const startIso = `${booking.booking_date}T${booking.booking_time}:00`;
  const startDate = new Date(`${startIso}Z`);
  const endIso = new Date(startDate.getTime() + durationMinutes * 60_000).toISOString().slice(0, 19);

  const meetingUrl = await createGoogleMeetEvent({
    ownerId: event.user_id,
    summary: event.event_title || event.title || "Meeting",
    description: event.description || "",
    guestEmail: booking.guest_email,
    startIso,
    endIso,
    timeZone: booking.guest_timezone,
  });

  if (meetingUrl) {
    await supabaseAdmin.from("bookings").update({ meeting_url: meetingUrl }).eq("id", booking.id);
  }

  return NextResponse.json({ meetingUrl });
}
