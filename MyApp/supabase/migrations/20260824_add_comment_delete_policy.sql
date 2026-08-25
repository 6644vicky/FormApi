create policy "Owners can delete their own booking comments" on booking_comments
  for delete using (user_id = auth.uid());

notify pgrst, 'reload schema';
