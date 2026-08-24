import { supabaseAdmin } from "@/lib/publicEvent";

// A separate OAuth client from the one Supabase uses for "Sign in with
// Google" — Supabase holds that client's secret internally, so it can never
// be used to refresh a token later at booking time, when the event owner
// isn't in the browser to hand over a fresh one. This client is registered
// directly in Google Cloud by the app owner (see GOOGLE_CALENDAR_CLIENT_ID
// in .env.local) purely so this app can create real Calendar events on the
// owner's behalf, long after they connected.
const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function getGoogleCalendarAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Forces Google to reissue a refresh_token even for a user who's
    // connected before — without this, a returning user's second
    // consent only returns an access_token, and re-connecting after a
    // revoke would silently leave the app with no refresh token at all.
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) return null;
  return (await response.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function saveGoogleCalendarConnection(userId: string, code: string, redirectUri: string): Promise<boolean> {
  const tokens = await exchangeCodeForTokens(code, redirectUri);
  if (!tokens?.refresh_token) return false;

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await supabaseAdmin.from("google_calendar_tokens").upsert({
    user_id: userId,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    access_token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("google_calendar_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) return null;
  const tokens = (await response.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("google_calendar_tokens")
    .update({ access_token: tokens.access_token, access_token_expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return tokens.access_token;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("google_calendar_tokens")
    .select("refresh_token, access_token, access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  // A minute of slack so a token that's about to expire mid-request still
  // gets refreshed up front instead of failing the Calendar API call.
  const stillValid = data.access_token && data.access_token_expires_at
    && new Date(data.access_token_expires_at).getTime() - 60_000 > Date.now();
  if (stillValid) return data.access_token;

  return refreshAccessToken(userId, data.refresh_token);
}

// Best-effort: called right after a guest books a "G-meet" event. Returns
// null (never throws) whenever a real link can't be produced — e.g. the
// owner never connected Calendar, or their access was revoked — since the
// booking itself has already succeeded by the time this runs.
export async function createGoogleMeetEvent(params: {
  ownerId: string;
  summary: string;
  description: string;
  guestEmail: string;
  startIso: string;
  endIso: string;
  timeZone: string;
}): Promise<string | null> {
  const accessToken = await getValidAccessToken(params.ownerId);
  if (!accessToken) return null;

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startIso, timeZone: params.timeZone },
          end: { dateTime: params.endIso, timeZone: params.timeZone },
          attendees: params.guestEmail ? [{ email: params.guestEmail }] : [],
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const videoEntry = data.conferenceData?.entryPoints?.find(
      (entry: { entryPointType: string }) => entry.entryPointType === "video"
    );
    return videoEntry?.uri || data.hangoutLink || null;
  } catch {
    return null;
  }
}
