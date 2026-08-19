-- chatbot_agents was created (20260809_add_chatbot_agents.sql) without RLS.
-- The builder page queries it directly from the browser with the public
-- anon key, scoped only by a client-side .eq("user_id", ...) filter — with
-- no RLS, that filter is cosmetic: anyone holding the anon key (which is
-- unavoidably public) could read or write every user's rows directly via
-- the Supabase REST API, bypassing the app entirely.
alter table chatbot_agents enable row level security;

create policy "Users can view their own chatbot agents"
  on chatbot_agents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own chatbot agents"
  on chatbot_agents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own chatbot agents"
  on chatbot_agents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own chatbot agents"
  on chatbot_agents for delete
  using (auth.uid() = user_id);
