-- Consolidated setup for chatbot_agents: the original table (20260809), its
-- RLS policies (20260818), and the columns added since (agent_type, config).
-- Idempotent, so it's safe to run on a database that already has some of this.

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

create index if not exists chatbot_agents_user_workspace_idx
  on chatbot_agents (user_id, workspace_name);

-- Which kind of chatbot this is, chosen before the builder opens.
alter table chatbot_agents add column if not exists agent_type text not null default 'rules';

-- Description, category, connectors, skills and knowledge-base files, so
-- adding another field later needs no migration.
alter table chatbot_agents add column if not exists config jsonb not null default '{}'::jsonb;

alter table chatbot_agents enable row level security;

-- create policy has no IF NOT EXISTS, so each one is dropped first.
drop policy if exists "Users can view their own chatbot agents" on chatbot_agents;
create policy "Users can view their own chatbot agents"
  on chatbot_agents for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own chatbot agents" on chatbot_agents;
create policy "Users can insert their own chatbot agents"
  on chatbot_agents for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own chatbot agents" on chatbot_agents;
create policy "Users can update their own chatbot agents"
  on chatbot_agents for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own chatbot agents" on chatbot_agents;
create policy "Users can delete their own chatbot agents"
  on chatbot_agents for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
