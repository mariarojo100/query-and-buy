-- ============================================================================
-- 20260624110027_listing_views
-- Per-user "recently viewed" tracking for the personalized homepage (Sprint 11).
-- One row per (user, listing); re-viewing updates viewed_at. Owner-only RLS.
-- ============================================================================

create table public.listing_views (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index idx_listing_views_user on public.listing_views(user_id, viewed_at desc);

alter table public.listing_views enable row level security;

create policy listing_views_owner_all on public.listing_views
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
