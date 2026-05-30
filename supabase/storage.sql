-- Budget Properties image storage setup.
-- Run this in Supabase Dashboard -> SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read property images" on storage.objects;
create policy "Public can read property images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'property-images');

drop policy if exists "Partners can upload property images" on storage.objects;
create policy "Partners can upload property images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'property-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('partner', 'admin')
  )
);

drop policy if exists "Partners can update property images" on storage.objects;
create policy "Partners can update property images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'property-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('partner', 'admin')
  )
)
with check (
  bucket_id = 'property-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('partner', 'admin')
  )
);

drop policy if exists "Partners can delete property images" on storage.objects;
create policy "Partners can delete property images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'property-images'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('partner', 'admin')
  )
);
