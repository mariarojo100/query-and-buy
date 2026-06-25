-- ============================================================================
-- 20260624110011_avatars_storage
-- Supabase Storage bucket for profile avatars + owner-scoped RLS.
-- Path convention: avatars/{user_id}/<file>  → first path segment must equal
-- the uploader's auth.uid(). Public read so avatars render on public profiles.
-- (Separate from the profiles table; no profiles change here.)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,                                            -- 2 MB
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Public read (bucket is public, but an explicit SELECT policy is still required).
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Owner may write only under their own {user_id}/ prefix.
create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
