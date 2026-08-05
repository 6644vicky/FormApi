-- Scope calendar events to a workspace.
--
-- calendar_events only had user_id, so every event showed up in every one of
-- the user's workspaces. Workspaces live in workspace_agents and are
-- identified by (user_id, name) everywhere in the app (see deleteAgent), so
-- events reference the workspace by name for consistency.

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS workspace_name text;

-- The listing filters on both columns together.
CREATE INDEX IF NOT EXISTS calendar_events_user_workspace_idx
  ON calendar_events (user_id, workspace_name);

-- Events created before this column existed have workspace_name = NULL and so
-- will not appear under any workspace. If you want to adopt them into one,
-- edit the name below and run it; otherwise leave this commented out.
--
-- UPDATE calendar_events
--    SET workspace_name = '<put the workspace name here>'
--  WHERE workspace_name IS NULL;
