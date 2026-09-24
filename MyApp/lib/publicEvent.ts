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

const BASE_EVENT_COLUMNS =
  "id, title, event_title, description, owner_name, avatar_url, meeting_link, meeting_link_url, durations, hide_form_page";
// Tried in order, dropping one later-migration column at a time. Each tier is
// only reached when the one before it hit a missing-column error, so an
// environment that has `availability` but not yet `booking_questions` still
// serves real weekly hours instead of falling all the way back to defaults.
const EVENT_COLUMN_TIERS = [
  `${BASE_EVENT_COLUMNS}, availability, booking_questions, design_settings`,
  `${BASE_EVENT_COLUMNS}, availability, booking_questions`,
  `${BASE_EVENT_COLUMNS}, availability`,
  BASE_EVENT_COLUMNS,
];

// The owner's "Booking questions" toggles, flattened to key -> shown. A null
// column (event predates the migration) yields {}, which every reader treats
// as "show the question", so nothing disappears for existing events.
function formatBookingQuestions(raw: unknown): Record<string, boolean> {
  if (!Array.isArray(raw)) return {};
  const enabledByKey: Record<string, boolean> = {};
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { key, enabled } = entry as { key?: unknown; enabled?: unknown };
    if (typeof key === "string" && typeof enabled === "boolean") {
      enabledByKey[key] = enabled;
    }
  }
  return enabledByKey;
}

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
  booking_questions?: unknown;
  design_settings?: unknown;
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
    bookingQuestions: formatBookingQuestions(data.booking_questions),
    // Passed through as-is; the booking page merges it over its defaults, so a
    // partial or absent object can't blank a setting.
    designSettings:
      data.design_settings && typeof data.design_settings === "object"
        ? (data.design_settings as Record<string, unknown>)
        : null,
  };
}

// Runs `select` through EVENT_COLUMN_TIERS, stepping down only on a
// missing-column error so unrelated failures still surface as failures.
async function selectEventThroughTiers(
  applyFilters: (query: ReturnType<ReturnType<typeof supabaseAdmin.from>["select"]>) => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>
) {
  for (let tier = 0; tier < EVENT_COLUMN_TIERS.length; tier++) {
    const { data, error } = await applyFilters(
      supabaseAdmin.from("calendar_events").select(EVENT_COLUMN_TIERS[tier])
    );
    const isLastTier = tier === EVENT_COLUMN_TIERS.length - 1;
    if (!isLastTier && isMissingAvailabilityColumnError(error)) continue;
    if (error || !data) return null;
    return data as Parameters<typeof formatPublicEvent>[0];
  }
  return null;
}

export async function getPublicEventById(id: string) {
  const data = await selectEventThroughTiers((query) => query.eq("id", id).single());
  if (!data) return null;
  return formatPublicEvent(data);
}

export async function getPublicEventBySlug(username: string, slug: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .single();

  if (profileError || !profile) return null;

  const data = await selectEventThroughTiers((query) =>
    query.eq("user_id", profile.id).eq("slug", slug).single()
  );
  if (!data) return null;
  return formatPublicEvent(data);
}
