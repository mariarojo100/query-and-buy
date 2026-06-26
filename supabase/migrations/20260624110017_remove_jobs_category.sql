-- ============================================================================
-- 20260624110017_remove_jobs_category
-- Sprint 8.5 — Query & Buy is products-only; the "Jobs" category is retired.
-- Categories are table rows (not an enum), so removal is a data change:
--   1. reassign any listings still on Jobs to the closest valid category (Services)
--      — listings.category_id is ON DELETE RESTRICT, so this must happen first.
--   2. delete the Jobs category row.
-- Idempotent: a no-op if Jobs was never seeded (fresh DBs).
-- ============================================================================

update public.listings
set category_id = (select id from public.categories where slug = 'services')
where category_id = (select id from public.categories where slug = 'jobs');

delete from public.categories where slug = 'jobs';
