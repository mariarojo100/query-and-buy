-- ============================================================================
-- 20260624110021_orders_completion
-- Post-reservation completion stage (Sprint 9 extension):
--   completed_at — set when the seller marks the deal Sold (order → completed).
--   cancelled_at — set when an order is cancelled / a reservation re-activated.
-- ============================================================================

alter table public.orders
  add column completed_at timestamptz,
  add column cancelled_at timestamptz;
