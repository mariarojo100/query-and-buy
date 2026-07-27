-- Add a short, URL-friendly public_id to listings (12 hex chars) to replace the
-- UUID in listing URLs. Idempotent: safe to re-run.
--
-- 1) add the column (nullable first, so existing rows can be backfilled)
alter table listings add column if not exists public_id text;

-- 2) backfill any rows still missing one. 12 hex chars = 16^12 ≈ 2.8e14 space,
--    so a collision across a realistic number of listings is negligible; the
--    unique index below is the hard guarantee.
update listings
set public_id = substr(md5(gen_random_uuid()::text), 1, 12)
where public_id is null;

-- 3) enforce uniqueness
create unique index if not exists listings_public_id_key on listings (public_id);

-- 4) new rows get one automatically (matches the Prisma @default)
alter table listings alter column public_id set default substr(md5(gen_random_uuid()::text), 1, 12);

-- 5) now that every row has a value, require it
alter table listings alter column public_id set not null;
