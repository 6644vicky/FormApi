-- Real Google Meet links: when a guest books a "G-meet" event, the server
-- creates an actual Google Calendar event (with conference data) using the
-- event owner's stored Calendar OAuth token, and saves the resulting join
-- URL here instead of just labelling the booking "G-meet".
alter table bookings add column if not exists meeting_url text;

-- booking_date/booking_time are the guest's own wall-clock values with no
-- offset attached (see PublicBookingView.tsx) — without the zone they were
-- chosen in, a generated Calendar event would land at the wrong actual
-- moment for everyone. Nullable: existing rows predate this and just won't
-- get a Meet link generated for them, same as any other legacy booking.
alter table bookings add column if not exists guest_timezone text;

-- One row per user who has connected their own Google Calendar (via the
-- app's dedicated OAuth client, separate from Supabase's own Google sign-in
-- client — that one's secret isn't available to this app, so it can't be
-- used to refresh a token later at booking time). Holds a long-lived refresh
-- token plus a cached access token so most requests skip the refresh round
-- trip. No RLS policies are defined, so only the service-role key (used
-- exclusively by server-side API routes) can read or write this table —
-- never the anon key, and never a plain authenticated user.
create table if not exists google_calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table google_calendar_tokens enable row level security;

notify pgrst, 'reload schema';
