-- Profiles: one row per user, holding the unique username used to build
-- vanity booking URLs (formsparrow.com/{username}/{slug}). Usernames are
-- edited from account settings, not from the calendar-builder page.
--
-- calendar_events.slug is the per-event segment of that same URL. It's
-- unique per user (not globally), since the username already namespaces it.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

alter table calendar_events add column if not exists slug text;

-- Partial index: NULL slugs (events created before this migration, or never
-- given one) don't collide with each other.
create unique index if not exists calendar_events_user_slug_idx
  on calendar_events (user_id, slug)
  where slug is not null;
