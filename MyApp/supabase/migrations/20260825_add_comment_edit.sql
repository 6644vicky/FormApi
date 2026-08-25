alter table booking_comments add column if not exists edited_at timestamptz;

create policy "Owners can edit their own booking comments" on booking_comments
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
