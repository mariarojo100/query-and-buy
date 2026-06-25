-- ============================================================================
-- 20260624110013_listing_images_storage
-- Storage bucket for listing photos + owner-scoped RLS, and a denormalized
-- listings_count maintained on profiles. Path convention:
--   listing-images/{user_id}/{group}/<file>  → first segment = uploader uid.
-- (Additive — no listings/profiles column changes.)
-- ============================================================================

-- ---------- storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,                                            -- 5 MB
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do nothing;

create policy "listing_images_public_read" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "listing_images_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_owner_update" on storage.objects
  for update using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- denormalized profiles.listings_count ----------
-- Counts a seller's live (active, not soft-deleted) listings. Maintained on
-- insert / status change / soft-delete / delete. SECURITY DEFINER so it can
-- write profiles regardless of the acting user's RLS.
create or replace function public.recount_seller_listings(_seller uuid)
returns void language sql security definer set search_path = public as $$
  update public.profiles p
  set listings_count = (
    select count(*) from public.listings l
    where l.seller_id = _seller
      and l.status = 'active'
      and l.deleted_at is null
  )
  where p.id = _seller;
$$;

create or replace function public.trg_listings_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    perform public.recount_seller_listings(new.seller_id);
  elsif (tg_op = 'DELETE') then
    perform public.recount_seller_listings(old.seller_id);
  elsif (tg_op = 'UPDATE') then
    -- Recount affected seller(s) when status, soft-delete, or ownership changes.
    if (new.status is distinct from old.status
        or new.deleted_at is distinct from old.deleted_at
        or new.seller_id is distinct from old.seller_id) then
      perform public.recount_seller_listings(new.seller_id);
      if (new.seller_id is distinct from old.seller_id) then
        perform public.recount_seller_listings(old.seller_id);
      end if;
    end if;
  end if;
  return null;
end;
$$;

create trigger trg_listings_count_aiud
  after insert or update or delete on public.listings
  for each row execute function public.trg_listings_count();
