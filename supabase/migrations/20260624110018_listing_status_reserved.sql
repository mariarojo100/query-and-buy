-- ============================================================================
-- 20260624110018_listing_status_reserved
-- Add 'reserved' to listing_status (Sprint 9). A listing becomes 'reserved'
-- when both parties confirm an order — hidden from the feed, not yet 'sold'.
-- Own migration: ALTER TYPE ... ADD VALUE cannot be used in the same txn it's
-- created in.
-- ============================================================================

alter type listing_status add value if not exists 'reserved';
