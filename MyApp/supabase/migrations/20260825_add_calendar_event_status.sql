alter table calendar_events add column if not exists status text not null default 'draft';
alter table calendar_events add column if not exists is_favorite boolean not null default false;
alter table calendar_events add column if not exists is_archived boolean not null default false;

alter table calendar_events drop constraint if exists calendar_events_status_check;
alter table calendar_events add constraint calendar_events_status_check check (status in ('draft', 'published'));

notify pgrst, 'reload schema';
