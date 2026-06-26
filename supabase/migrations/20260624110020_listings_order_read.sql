-- ============================================================================
-- 20260624110020_listings_order_read
-- After a deal confirms, the listing becomes 'reserved' (hidden from the feed).
-- The default listings_read policy (active OR owner OR staff) would then hide it
-- from the BUYER, breaking their order card / chat listing preview. This adds a
-- permissive policy so either party to an order can always read that listing.
-- The public feed/category queries still filter status='active', so reserved
-- listings remain hidden from the market.
-- ============================================================================

create policy listings_order_participant_read on public.listings
  for select using (
    exists (
      select 1 from public.orders o
      where o.listing_id = id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );
