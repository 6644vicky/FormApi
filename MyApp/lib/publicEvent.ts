import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_AVAILABILITY,
  isMissingAvailabilityColumnError,
  type WeeklyAvailability,
} from "@/lib/bookingTime";

// Shared by the /book/[id] and /[username]/[slug] public resolvers — both
// need to reach calendar_events without being signed in as its owner, so
// they use the service role key server-side and hand back only the fields
// a visitor is meant to see, never the whole row or the key itself.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const EVENT_COLUMNS =
  "id, title, event_title, description, owner_name, avatar_url, meeting_link, meeting_link_url, durations, hide_form_page, availability";
const LEGACY_EVENT_COLUMNS =
  "id, title, event_title, description, owner_name, avatar_url, meeting_link, meeting_link_url, durations, hide_form_page";

export function formatPublicEvent(data: {
  id: number;
  title: string | null;
  event_title: string | null;
  description: string | null;
  owner_name: string | null;
  avatar_url: string | null;
  meeting_link: string | null;
  durations: string[] | null;
  hide_form_page: boolean | null;
  availability?: WeeklyAvailability | null;
}) {
  return {
    id: data.id,
    title: data.event_title || data.title || "Meeting",
    description: data.description || "",
    ownerName: data.owner_name || "Host",
    avatarUrl: data.avatar_url || null,
    meetingLink: data.meeting_link || "Link",
    durations: data.durations || ["15 min"],
    hideFormPage: data.hide_form_page || false,
    availability: data.availability || DEFAULT_AVAILABILITY,
  };
}

export async function getPublicEventById(id: string) {
  let { data, error } = await supabaseAdmin
    .from("calendar_events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .single();

  // Keep older environments usable while the availability migration is being
  // deployed. New environments use the first query and persist configured
  // weekly hours normally.
  if (isMissingAvailabilityColumnError(error)) {
    ({ data, error } = await supabaseAdmin
      .from("calendar_events")
      .select(LEGACY_EVENT_COLUMNS)
      .eq("id", id)
      .single());
  }

  if (error || !data) return null;
  return formatPublicEvent(data);
}

export async function getPublicEventBySlug(username: string, slug: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .single();

  if (profileError || !profile) return null;

  let { data, error } = await supabaseAdmin
    .from("calendar_events")
    .select(EVENT_COLUMNS)
    .eq("user_id", profile.id)
    .eq("slug", slug)
    .single();

  if (isMissingAvailabilityColumnError(error)) {
    ({ data, error } = await supabaseAdmin
      .from("calendar_events")
      .select(LEGACY_EVENT_COLUMNS)
      .eq("user_id", profile.id)
      .eq("slug", slug)
      .single());
  }

  if (error || !data) return null;
  return formatPublicEvent(data);
}
