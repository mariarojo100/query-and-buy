-- ============================================================================
-- 20260624110022_reviews
-- Buyer ⇄ seller reviews for completed orders. One review per user per order,
-- only on COMPLETED orders, only by the two participants — enforced by RLS.
-- ============================================================================

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  listing_id    uuid not null references public.listings(id) on delete cascade,
  reviewer_id   uuid not null references public.profiles(id) on delete cascade,
  reviewee_id   uuid not null references public.profiles(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('buyer', 'seller')),
  rating        int not null check (rating between 1 and 5),
  review_text   text check (review_text is null or char_length(review_text) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (order_id, reviewer_id)
);

create index idx_reviews_reviewee on public.reviews(reviewee_id, created_at desc);
create index idx_reviews_listing on public.reviews(listing_id);

create trigger trg_reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

alter table public.reviews enable row level security;

-- Reviews are public (they build marketplace reputation).
create policy reviews_public_read on public.reviews
  for select using (true);

-- Insert only by a participant of a COMPLETED order, reviewing the counterpart,
-- with the correct role.
create policy reviews_participant_insert on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.status = 'completed'
        and o.listing_id = listing_id
        and (
          (reviewer_role = 'buyer'  and o.buyer_id  = auth.uid() and reviewee_id = o.seller_id)
          or
          (reviewer_role = 'seller' and o.seller_id = auth.uid() and reviewee_id = o.buyer_id)
        )
    )
  );

-- A reviewer may edit their own review.
create policy reviews_owner_update on public.reviews
  for update using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
