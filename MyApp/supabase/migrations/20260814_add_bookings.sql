create table if not exists bookings (
  id bigint generated always as identity primary key,
  event_id bigint not null references calendar_events(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  guest_notes text,
  booking_date date not null,
  booking_time text not null,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;

-- Guests booking a public event are never signed in, so inserts have to be
-- open to anyone — the event_id foreign key is what keeps this scoped.
create policy "Anyone can create a booking" on bookings
  for insert
  with check (true);

-- Only the event's own owner can read the guest details that came in.
create policy "Event owners can view their bookings" on bookings
  for select
  using (
    exists (
      select 1 from calendar_events
      where calendar_events.id = bookings.event_id
      and calendar_events.user_id = auth.uid()
    )
  );
