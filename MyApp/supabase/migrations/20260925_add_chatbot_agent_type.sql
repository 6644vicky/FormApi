-- Which kind of chatbot this is, chosen in the "New chatbot" dialog before the
-- builder opens: 'rules' (buttons and scripted replies) or 'ai' (answers typed
-- questions from your content). Existing rows predate the chooser.
alter table chatbot_agents add column if not exists agent_type text not null default 'rules';

notify pgrst, 'reload schema';
