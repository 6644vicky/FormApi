alter table calendar_events add column if not exists is_offline boolean not null default false;

notify pgrst, 'reload schema';
