-- Weekly hours configured in the calendar-builder's Availability panel were
-- local-only UI state — nothing persisted them, and the live booking page
-- always showed a hardcoded 9am-5pm regardless of what an owner configured.
-- Null means "not set yet" (events created before this existed); the app
-- falls back to the same Mon-Fri 9-5 default in that case, so nothing
-- changes for existing events until their owner edits Availability.
alter table calendar_events add column if not exists availability jsonb;

-- PostgREST may keep the old table definition in its schema cache after the
-- DDL succeeds. Reload it so the API can see availability immediately.
notify pgrst, 'reload schema';
