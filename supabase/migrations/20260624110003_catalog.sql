-- ============================================================================
-- 20260624110003_catalog
-- Hierarchical category catalog (self-referencing tree).
-- Source: database-design.md §2.4
-- ============================================================================

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.categories(id) on delete restrict,
  slug       text unique not null,
  name_en    text not null,
  name_ar    text not null,
  icon       text,
  position   smallint not null default 0,
  is_active  bool not null default true,
  created_at timestamptz not null default now()
);
