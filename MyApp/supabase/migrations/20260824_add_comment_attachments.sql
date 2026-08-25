alter table booking_comments alter column body drop not null;
alter table booking_comments add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('comment-attachments', 'comment-attachments', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload comment attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comment-attachments');

create policy "Anyone can view comment attachments" on storage.objects
  for select using (bucket_id = 'comment-attachments');

notify pgrst, 'reload schema';
