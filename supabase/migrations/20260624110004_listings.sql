-- ============================================================================
-- 20260624110004_listings
-- Core marketplace object + images, embeddings, price suggestions.
-- Source: database-design.md §2.5–§2.8
-- NOTE: search_vector is kept ONLY as the generated column (the doc flags the
--       duplicate plain column for removal — see §2.5 note).
-- ============================================================================

-- ---------- 2.5 listings ----------
create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.users(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete restrict,
  title_en      text not null,
  title_ar      text,
  description   text not null,
  attributes    jsonb not null default '{}',         -- category-specific facets
  price_fils    bigint not null check (price_fils >= 0),
  currency      char(3) not null default 'AED',
  is_negotiable bool not null default true,
  condition     listing_condition not null default 'used',
  status        listing_status not null default 'draft',
  emirate       emirate,
  area          text,
  location      geography(Point,4326),               -- optional precise pin
  is_urgent     bool not null default false,
  urgent_until  timestamptz,
  ai_generated  bool not null default false,
  view_count    integer not null default 0,
  -- bilingual full-text search vector (generated column form only)
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title_en,'') || ' ' || coalesce(title_ar,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B')
  ) stored,
  published_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create trigger trg_listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- ---------- 2.6 listing_images ----------
create table public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  storage_key text not null,                          -- Supabase Storage object path
  cdn_url     text,
  position    smallint not null default 0,
  width       int,
  height      int,
  ai_labels   jsonb,                                  -- vision: detected objects/scene
  is_safe     bool not null default true,             -- moderation gate before public
  created_at  timestamptz not null default now()
);

-- ---------- 2.7 listing_embeddings (pgvector) ----------
create table public.listing_embeddings (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  embedding  vector(1024),
  model      text,
  updated_at timestamptz not null default now()
);

-- ---------- 2.8 price_suggestions ----------
create table public.price_suggestions (
  id                   uuid primary key default gen_random_uuid(),
  listing_id           uuid references public.listings(id) on delete cascade,
  user_id              uuid references public.users(id) on delete set null,
  suggested_min_fils   bigint not null,
  suggested_max_fils   bigint not null,
  suggested_point_fils bigint,
  basis                text not null default 'comparables',  -- comparables | model
  comparables          jsonb,                                -- listing ids + prices used
  model                text,
  created_at           timestamptz not null default now()
);
