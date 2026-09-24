-- Per-event booking form field config, set from the Build tab's "Booking
-- questions" panel. Stored as the same array shape the builder holds in
-- state, e.g.
--   [{"key":"phone","enabled":false}, {"key":"notes","enabled":true}, ...]
-- Only the key/enabled pair matters to readers: labels and field types stay
-- defined in code, so a null column just means "every question at its
-- default", which is what every event created before this migration gets.
alter table calendar_events add column if not exists booking_questions jsonb;

notify pgrst, 'reload schema';
