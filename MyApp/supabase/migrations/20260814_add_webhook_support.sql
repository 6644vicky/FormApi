-- Lets a third-party form (Framer's Webhook action, Zapier, a raw curl, etc.)
-- post lead data straight to a specific event without the visitor ever
-- landing on our booking page. The event is identified by this key alone —
-- there's no separate secret to configure on our side.
alter table calendar_events add column if not exists api_key text default gen_random_uuid()::text;
update calendar_events set api_key = gen_random_uuid()::text where api_key is null;
alter table calendar_events alter column api_key set not null;
create unique index if not exists calendar_events_api_key_idx on calendar_events (api_key);

-- Webhook payloads rarely match our fixed guest_name/email/phone shape, and
-- carry no real meeting date/time (there's no calendar step) — keep
-- whatever extra fields the third party sends and mark how the row arrived.
alter table bookings add column if not exists extra_fields jsonb;
alter table bookings add column if not exists source text not null default 'calendar';
