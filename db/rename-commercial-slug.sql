-- Rename the ambiguous "commercial" category slug to "commercial-property".
-- Idempotent: re-running is a no-op once the slug has been changed (0 rows).
-- The old /category/commercial URLs are 301-redirected in middleware.ts.
update categories
set slug = 'commercial-property'
where slug = 'commercial';
