-- Allow a user to own more than one calendar event.
--
-- calendar_events was created with a UNIQUE constraint on user_id
-- (Postgres auto-named it calendar_events_user_id_key). That capped every
-- account at a single event row, so creating a second one failed with:
--
--   duplicate key value violates unique constraint "calendar_events_user_id_key"
--
-- The relationship is one user -> many events, so user_id wants a plain
-- index, not a unique one.
--
-- This is structural only: no rows are deleted or modified, and it only
-- widens what is permitted, so nothing that already works breaks.

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_user_id_key;

-- Dropping the constraint also drops its backing unique index, so add a
-- regular one. The app filters on user_id for every listing query.
CREATE INDEX IF NOT EXISTS calendar_events_user_id_idx
  ON calendar_events (user_id);
