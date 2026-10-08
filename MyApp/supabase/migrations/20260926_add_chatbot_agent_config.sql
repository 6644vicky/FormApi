-- Everything the agent detail page keeps that doesn't warrant its own column:
-- the one-line description, category, selected connectors and skills, and the
-- knowledge-base file list. One jsonb blob so adding a field later needs no
-- migration; the page degrades gracefully when this column is missing.
alter table chatbot_agents add column if not exists config jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
