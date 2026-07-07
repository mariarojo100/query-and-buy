-- ============================================================================
-- db/seed.sql — reference data for the self-managed target DB
-- Part of MIGRATION_TASKS.md Phase 1. Idempotent; safe to re-run.
-- Ports: supabase/migrations/20260624110010_seed_categories.sql (category tree
-- as it stands AFTER 110017 removed 'jobs') and the marketplace_settings
-- singleton from 20260624110026_admin_ops.sql.
--
-- NOT included here (per MIGRATION_BLUEPRINT.md §2.1):
--   * the admin-role grant (110026 seeded it by email) — that is an ops
--     runbook step at cutover: after data migration, verify the operator's
--     user_roles row exists; the ADMIN_EMAILS env gate covers the gap.
--   * any user/listing demo data.
-- ============================================================================

-- ---------- top-level categories ----------
insert into public.categories (slug, name_en, name_ar, position) values
  ('vehicles',    'Vehicles',              'المركبات',              1),
  ('property',    'Property',              'العقارات',              2),
  ('electronics', 'Electronics',           'الإلكترونيات',          3),
  ('mobiles',     'Mobiles & Tablets',     'الهواتف والأجهزة',      4),
  ('home-garden', 'Home & Garden',         'المنزل والحديقة',       5),
  ('fashion',     'Fashion & Beauty',      'الموضة والجمال',        6),
  ('services',    'Services',              'الخدمات',               8),
  ('hobbies',     'Hobbies, Sports & Kids','الهوايات والرياضة',     9),
  ('business',    'Business & Industrial', 'الأعمال والصناعة',      10)
on conflict (slug) do nothing;

-- ---------- vehicles ----------
insert into public.categories (parent_id, slug, name_en, name_ar, position) values
  ((select id from public.categories where slug='vehicles'), 'cars',           'Cars',            'سيارات',          1),
  ((select id from public.categories where slug='vehicles'), 'motorcycles',    'Motorcycles',     'دراجات نارية',    2),
  ((select id from public.categories where slug='vehicles'), 'auto-parts',     'Auto Parts',      'قطع غيار',        3),
  ((select id from public.categories where slug='vehicles'), 'heavy-vehicles', 'Heavy Vehicles',  'مركبات ثقيلة',    4),
  ((select id from public.categories where slug='vehicles'), 'boats',          'Boats',           'قوارب',           5)
on conflict (slug) do nothing;

-- ---------- property ----------
insert into public.categories (parent_id, slug, name_en, name_ar, position) values
  ((select id from public.categories where slug='property'), 'apartments-rent', 'Apartments for Rent', 'شقق للإيجار',  1),
  ((select id from public.categories where slug='property'), 'apartments-sale', 'Apartments for Sale', 'شقق للبيع',    2),
  ((select id from public.categories where slug='property'), 'villas-rent',     'Villas for Rent',     'فلل للإيجار',  3),
  ((select id from public.categories where slug='property'), 'villas-sale',     'Villas for Sale',     'فلل للبيع',    4),
  ((select id from public.categories where slug='property'), 'commercial',      'Commercial',          'تجاري',        5),
  ((select id from public.categories where slug='property'), 'rooms',           'Rooms & Shared',      'غرف للمشاركة', 6)
on conflict (slug) do nothing;

-- ---------- electronics ----------
insert into public.categories (parent_id, slug, name_en, name_ar, position) values
  ((select id from public.categories where slug='electronics'), 'computers', 'Computers & Laptops', 'كمبيوتر',      1),
  ((select id from public.categories where slug='electronics'), 'tv-audio',  'TV & Audio',          'تلفزيون وصوت', 2),
  ((select id from public.categories where slug='electronics'), 'gaming',    'Gaming',              'ألعاب',        3),
  ((select id from public.categories where slug='electronics'), 'cameras',   'Cameras',             'كاميرات',      4)
on conflict (slug) do nothing;

-- ---------- home & garden ----------
insert into public.categories (parent_id, slug, name_en, name_ar, position) values
  ((select id from public.categories where slug='home-garden'), 'furniture',  'Furniture',  'أثاث',          1),
  ((select id from public.categories where slug='home-garden'), 'appliances', 'Appliances', 'أجهزة منزلية',  2),
  ((select id from public.categories where slug='home-garden'), 'home-decor', 'Home Decor', 'ديكور منزلي',   3),
  ((select id from public.categories where slug='home-garden'), 'garden',     'Garden',     'حديقة',         4)
on conflict (slug) do nothing;

-- ---------- marketplace settings singleton ----------
insert into public.marketplace_settings (id) values ('global') on conflict do nothing;
