-- Chatbot agents: one row per agent created from the Chatbot tab's
-- "Create agent" flow, scoped to a workspace the same way calendar_events
-- is (see 20260805_scope_calendar_events_to_workspace.sql).
--
-- Rows are created as soon as the builder page saves its first real edit
-- (status defaults to 'Draft'), and flip to 'Published' when the user hits
-- Publish on that page — mirroring how calendar events autosave as drafts.

create table if not exists chatbot_agents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_name text,
  name text not null default 'Untitled',
  tone text not null default 'Professional',
  response_length text not null default 'Standard',
  business_context text not null default '',
  alignment text not null default 'right',
  welcome_message text not null default 'Hi there! 👋 How can I help you today?',
  message_placeholder text not null default 'Type your message...',
  footer_text text not null default '',
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The listing filters on both columns together, same as calendar_events.
create index if not exists chatbot_agents_user_workspace_idx
  on chatbot_agents (user_id, workspace_name);
