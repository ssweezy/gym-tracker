-- Per-exercise photo + technique source link.
alter table public.exercises
  add column if not exists image_url text;
alter table public.exercises
  add column if not exists technique_url text;

-- Storage bucket for user-uploaded custom-exercise photos.
-- 3 MB cap + image mime allow-list enforced by Storage itself, so a huge
-- file is rejected before it ever reaches the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-photos',
  'exercise-photos',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can view exercise photos (public bucket).
drop policy if exists "exercise photos public read" on storage.objects;
create policy "exercise photos public read"
  on storage.objects for select
  using (bucket_id = 'exercise-photos');

-- A signed-in user may only write into their own folder:
-- exercise-photos/<auth.uid()>/<file>
drop policy if exists "exercise photos owner insert" on storage.objects;
create policy "exercise photos owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exercise-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exercise photos owner update" on storage.objects;
create policy "exercise photos owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'exercise-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exercise photos owner delete" on storage.objects;
create policy "exercise photos owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exercise-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
