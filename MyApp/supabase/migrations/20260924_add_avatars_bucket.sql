-- Public bucket for profile avatars uploaded from Settings -> Personal details.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "Authenticated users can replace their avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars');

create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

notify pgrst, 'reload schema';
