import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public booking pages (app/book/[id]) and the embeddable widget/iframe
// need to read an event without being signed in as its owner. calendar_events
// is scoped by RLS to the owning user, so this route uses the service role
// key server-side to reach the row, then hands back only the fields a
// visitor is meant to see — never the whole row, never the key itself.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .select("id, title, event_title, description, owner_name, avatar_url, meeting_link, meeting_link_url, durations")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    title: data.event_title || data.title || "Meeting",
    description: data.description || "",
    ownerName: data.owner_name || "Host",
    avatarUrl: data.avatar_url || null,
    meetingLink: data.meeting_link || "Link",
    durations: data.durations || ["15 min"],
  });
}
