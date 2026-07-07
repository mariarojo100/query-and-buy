-- ============================================================================
-- 0001_schema.sql — Query & Buy baseline schema (self-managed PostgreSQL 17)
--
-- Provenance: authored 2026-07-06 from the NET state of the 32 Supabase
-- migrations in supabase/migrations/ (20260624110001 → 20260702120000),
-- applied mentally in filename order. All ALTERs are folded into the CREATE
-- statements (e.g. 110018's ALTER TYPE listing_status ADD VALUE 'reserved' is
-- folded into the CREATE TYPE; 110012/110016 profile columns, 110014
-- conversation read-state, 110021 order completion, and 110026 listing/report
-- columns are folded into their CREATE TABLE statements). reports is the
-- 110015 rewrite plus the 110026 columns; the original 110006 reports table
-- (and its idx_reports_target index) never exists here.
--
-- Deliberately EXCLUDED (per MIGRATION_BLUEPRINT.md §2.1):
--   * CREATE EXTENSION statements (see 0000_extensions.sql; extensions are
--     assumed present: pgcrypto, postgis, vector, pg_trgm, citext)
--   * The FK from public.users.id to auth.users(id) — the app supplies the id
--   * Supabase-only functions/triggers: handle_new_user, sync_email_verified,
--     sync_phone_verified, ensure_self_profile, guard_phone_verified,
--     has_role, is_staff, is_admin, is_conversation_participant
--   * ALL row-level security, policies, and grants to anon/authenticated/
--     service_role; anything touching storage.* or realtime publications
--   * Seed/data rows (categories, marketplace_settings singleton, admin role)
--     — these live in a separate seed file
--
-- PENDING VERIFICATION against a live `pg_dump` before production use.
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES (110001; listing_status 'reserved' folded in from 110018)
--    report_reason / report_status are orphaned since the 110015 reports
--    rewrite but kept so schema diffs against the live DB stay clean.
-- ============================================================================

create type user_status        as enum ('active','suspended','banned','deleted');
create type app_role           as enum ('user','moderator','admin','super_admin');
create type emirate            as enum ('dubai','abu_dhabi','sharjah','ajman',
                                        'umm_al_quwain','ras_al_khaimah','fujairah');
create type listing_status     as enum ('draft','pending_review','active','sold',
                                        'expired','rejected','deleted','reserved');
create type listing_condition  as enum ('new','like_new','used','for_parts');
create type verification_type  as enum ('mobile','email','emirates_id');
create type verification_status as enum ('pending','verified','failed','expired','rejected');
create type conversation_status as enum ('open','archived','blocked');
create type report_target      as enum ('listing','user','message');
create type report_reason      as enum ('scam','prohibited','spam','offensive',
                                        'wrong_category','counterfeit','other');
create type report_status      as enum ('open','reviewing','actioned','dismissed');
create type admin_action_type  as enum ('approve_listing','reject_listing','remove_listing',
                                        'suspend_user','ban_user','reinstate_user',
                                        'verify_user','dismiss_report','other');

-- ============================================================================
-- 2. TABLES (dependency order)
-- ============================================================================

-- ---------- users: private account state (110002) ----------
-- NOTE: id has no default and no FK — the application supplies the id
-- (formerly auth.users(id); dropped per MIGRATION_BLUEPRINT §2.1).
create table public.users (
  id             uuid primary key,
  phone_e164     text unique,                       -- mirrored from auth for app queries
  email          citext unique,
  status         user_status not null default 'active',
  locale         text not null default 'en',        -- 'en' | 'ar'
  trust_score    smallint not null default 0,       -- derived, cached
  has_mobile_verified bool not null default false,
  has_email_verified  bool not null default false,
  has_eid_verified    bool not null default false,
  flagged        bool not null default false,       -- safety hold
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- ---------- profiles: public seller card (110002 + 110012 + 110016) ----------
create table public.profiles (
  id            uuid primary key references public.users(id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  bio           text,
  emirate       emirate,
  badge_level   text not null default 'none',        -- none | basic | verified
  rating_avg    numeric(2,1) not null default 0,     -- 0.0–5.0
  rating_count  integer not null default 0,
  listings_count integer not null default 0,         -- denormalized counter
  member_since  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  username      citext unique,                       -- 110012
  email_verified boolean not null default false,     -- 110016
  phone_verified boolean not null default false,     -- 110016
  reports_count  integer not null default 0          -- 110016, denormalized
);

-- ---------- user_roles: RBAC (110002) ----------
create table public.user_roles (
  user_id    uuid not null references public.users(id) on delete cascade,
  role       app_role not null default 'user',
  granted_by uuid references public.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------- categories (110003) ----------
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

-- ---------- listings (110004 + 110026 featured columns) ----------
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
  is_featured   boolean not null default false,      -- 110026
  featured_until timestamptz,                        -- 110026
  published_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- ---------- listing_images (110004) ----------
create table public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  storage_key text not null,                          -- storage object path
  cdn_url     text,
  position    smallint not null default 0,
  width       int,
  height      int,
  ai_labels   jsonb,                                  -- vision: detected objects/scene
  is_safe     bool not null default true,             -- moderation gate before public
  created_at  timestamptz not null default now()
);

-- ---------- listing_embeddings (110004, pgvector) ----------
create table public.listing_embeddings (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  embedding  vector(1024),
  model      text,
  updated_at timestamptz not null default now()
);

-- ---------- price_suggestions (110004) ----------
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

-- ---------- conversations (110005 + 110014 read-state) ----------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  buyer_id        uuid not null references public.users(id) on delete cascade,
  seller_id       uuid not null references public.users(id) on delete cascade,
  status          conversation_status not null default 'open',
  last_message_at timestamptz,
  buyer_unread    smallint not null default 0,
  seller_unread   smallint not null default 0,
  created_at      timestamptz not null default now(),
  buyer_last_read_at  timestamptz,                    -- 110014
  seller_last_read_at timestamptz,                    -- 110014
  unique (listing_id, buyer_id)                       -- one thread per buyer per listing
);

-- ---------- messages (110005) ----------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  body            text,
  attachments     jsonb,                              -- [{key,type}]
  flagged         bool not null default false,        -- scam/abuse detector
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- saved_searches (110006) ----------
create table public.saved_searches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  label          text,
  query_text     text,                                -- raw NL query
  parsed_filters jsonb not null default '{}',         -- {category,price,emirate,attrs}
  notify         bool not null default true,
  notify_channel text not null default 'push',        -- push | email
  last_run_at    timestamptz,
  last_match_at  timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------- favorites (110006, M:N user <-> listing) ----------
create table public.favorites (
  user_id    uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- verification_requests (110006) ----------
create table public.verification_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  type         verification_type not null,
  status       verification_status not null default 'pending',
  source       text,                                  -- 'uae_pass' | 'otp' | 'manual_doc'
  eid_number_hash text,                               -- HMAC for one-ID-one-account dedupe
  doc_front_key   text,                               -- private storage key
  doc_back_key    text,
  metadata     jsonb,                                 -- non-PII verification metadata
  reviewed_by  uuid references public.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- reports (110015 rewrite + 110026 columns) ----------
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles(id) on delete cascade,
  listing_id       uuid references public.listings(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason           text not null,
  description      text,
  status           text not null default 'open',
  created_at       timestamptz not null default now(),
  message_id       uuid references public.messages(id) on delete set null,  -- 110026
  admin_notes      text,                                                    -- 110026
  -- A report must target a listing and/or a user (not nothing).
  constraint reports_has_target check (listing_id is not null or reported_user_id is not null)
);

-- ---------- admin_actions (110006, append-only staff audit trail) ----------
create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.users(id) on delete set null,  -- nullable: survives actor deletion
  action      admin_action_type not null,
  target_type report_target,
  target_id   uuid,
  reason      text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- orders (110019 + 110021 completion columns) ----------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  buyer_id         uuid not null references public.profiles(id) on delete cascade,
  seller_id        uuid not null references public.profiles(id) on delete cascade,
  accepted_price_fils bigint,
  -- negotiating | offer_sent | offer_accepted | awaiting_confirmation | confirmed | cancelled | completed
  status           text not null default 'negotiating',
  buyer_confirmed  boolean not null default false,
  seller_confirmed boolean not null default false,
  contact_revealed boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz,                       -- 110021
  cancelled_at     timestamptz,                       -- 110021
  unique (listing_id, buyer_id),
  constraint orders_distinct check (buyer_id <> seller_id)
);

-- ---------- offers (110019) ----------
create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  amount_fils     bigint not null check (amount_fils >= 0),
  -- pending | accepted | declined | countered | superseded
  status          text not null default 'pending',
  created_at      timestamptz not null default now()
);

-- ---------- reviews (110022) ----------
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

-- ---------- notifications (110023) ----------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- email_failures (110023, service-side email failure log) ----------
create table public.email_failures (
  id         uuid primary key default gen_random_uuid(),
  to_email   text,
  template   text,
  error      text,
  payload    jsonb,
  created_at timestamptz not null default now()
);

-- ---------- notification_preferences (110025) ----------
create table public.notification_preferences (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  offer_emails     boolean not null default true,
  chat_emails      boolean not null default true,
  order_emails     boolean not null default true,
  review_emails    boolean not null default true,
  marketing_emails boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- ---------- admin_audit_log (110026) ----------
create table public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- ai_moderation_log (110026) ----------
create table public.ai_moderation_log (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid references public.listings(id) on delete set null,
  source         text not null default 'listing',  -- listing | upload | message
  decision       text not null,                     -- allowed | blocked | flagged
  confidence     numeric,
  reason         text,
  human_override text,                              -- null | approved | rejected
  created_at     timestamptz not null default now()
);

-- ---------- marketplace_settings (110026, singleton; row seeded separately) ----------
create table public.marketplace_settings (
  id                    text primary key default 'global',
  marketplace_name      text not null default 'Query & Buy',
  logo_url              text,
  brand_colors          jsonb not null default '{}'::jsonb,
  contact_email         text,
  support_email         text default 'support@queryandbuy.ae',
  social_links          jsonb not null default '{}'::jsonb,
  terms_url             text,
  privacy_url           text,
  ai_settings           jsonb not null default '{}'::jsonb,
  moderation_thresholds jsonb not null default '{"min_confidence": 70}'::jsonb,
  maintenance_mode      boolean not null default false,
  updated_at            timestamptz not null default now(),
  constraint settings_singleton check (id = 'global')
);

-- ---------- listing_views (110027) ----------
create table public.listing_views (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- search_log (110028) ----------
create table public.search_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  query      text not null,
  created_at timestamptz not null default now()
);

-- ---------- feedback (110029) ----------
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  kind       text not null check (kind in ('bug', 'feature', 'general')),
  message    text not null check (char_length(message) between 1 and 2000),
  path       text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. FUNCTIONS
--    SECURITY DEFINER removed from counter functions (no RLS to bypass in the
--    target database); `set search_path = public` retained where present.
-- ============================================================================

-- ---------- generic updated_at trigger function (110001) ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- denormalized profiles.listings_count (110013) ----------
-- Counts a seller's live (active, not soft-deleted) listings. Maintained on
-- insert / status change / soft-delete / delete.
create or replace function public.recount_seller_listings(_seller uuid)
returns void language sql set search_path = public as $$
  update public.profiles p
  set listings_count = (
    select count(*) from public.listings l
    where l.seller_id = _seller
      and l.status = 'active'
      and l.deleted_at is null
  )
  where p.id = _seller;
$$;

create or replace function public.trg_listings_count()
returns trigger language plpgsql set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    perform public.recount_seller_listings(new.seller_id);
  elsif (tg_op = 'DELETE') then
    perform public.recount_seller_listings(old.seller_id);
  elsif (tg_op = 'UPDATE') then
    -- Recount affected seller(s) when status, soft-delete, or ownership changes.
    if (new.status is distinct from old.status
        or new.deleted_at is distinct from old.deleted_at
        or new.seller_id is distinct from old.seller_id) then
      perform public.recount_seller_listings(new.seller_id);
      if (new.seller_id is distinct from old.seller_id) then
        perform public.recount_seller_listings(old.seller_id);
      end if;
    end if;
  end if;
  return null;
end;
$$;

-- ---------- denormalized profiles.reports_count (110016) ----------
create or replace function public.recount_user_reports(_user uuid)
returns void language sql set search_path = public as $$
  update public.profiles p
  set reports_count = (
    select count(*) from public.reports r where r.reported_user_id = _user
  )
  where p.id = _user;
$$;

create or replace function public.trg_user_reports_count()
returns trigger language plpgsql set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    if new.reported_user_id is not null then
      perform public.recount_user_reports(new.reported_user_id);
    end if;
  elsif (tg_op = 'DELETE') then
    if old.reported_user_id is not null then
      perform public.recount_user_reports(old.reported_user_id);
    end if;
  elsif (tg_op = 'UPDATE') then
    if new.reported_user_id is distinct from old.reported_user_id then
      if old.reported_user_id is not null then
        perform public.recount_user_reports(old.reported_user_id);
      end if;
      if new.reported_user_id is not null then
        perform public.recount_user_reports(new.reported_user_id);
      end if;
    end if;
  end if;
  return null;
end;
$$;

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- updated_at touch triggers
create trigger trg_users_touch before update on public.users
  for each row execute function public.touch_updated_at();

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger trg_listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

create trigger trg_verif_touch before update on public.verification_requests
  for each row execute function public.touch_updated_at();

create trigger trg_orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create trigger trg_reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

create trigger trg_notif_prefs_touch before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

create trigger trg_settings_touch before update on public.marketplace_settings
  for each row execute function public.touch_updated_at();

-- denormalized counter triggers
create trigger trg_listings_count_aiud
  after insert or update or delete on public.listings
  for each row execute function public.trg_listings_count();

create trigger trg_user_reports_count_aiud
  after insert or update or delete on public.reports
  for each row execute function public.trg_user_reports_count();

-- ============================================================================
-- 5. INDEXES
--    (110006 uq_eid_hash; 110007 core set minus the two indexes on the old
--    reports table dropped by 110015's DROP ... CASCADE; then 110015, 110019,
--    110022, 110023, 110026, 110027, 110028, 110029.)
-- ============================================================================

-- users / profiles
create index idx_users_status        on public.users(status) where deleted_at is null;
create index idx_profiles_emirate     on public.profiles(emirate);
create index idx_profiles_name_trgm   on public.profiles using gin (display_name gin_trgm_ops);

-- categories
create index idx_categories_parent    on public.categories(parent_id);

-- listings: browse active, by category, by seller, geo, urgent, FTS, facets
create index idx_listings_status_pub  on public.listings(status, published_at desc)
                                       where status = 'active' and deleted_at is null;
create index idx_listings_category    on public.listings(category_id, status);
create index idx_listings_seller      on public.listings(seller_id);
create index idx_listings_emirate_cat on public.listings(emirate, category_id)
                                       where status = 'active';
create index idx_listings_geo         on public.listings using gist (location);
create index idx_listings_urgent      on public.listings(urgent_until)
                                       where is_urgent and status = 'active';
create index idx_listings_fts         on public.listings using gin (search_vector);
create index idx_listings_attrs       on public.listings using gin (attributes jsonb_path_ops);
create index idx_listings_featured    on public.listings(is_featured) where is_featured;

-- similarity (pgvector ivfflat)
create index idx_embeddings_ivf       on public.listing_embeddings
                                       using ivfflat (embedding vector_cosine_ops) with (lists = 200);

-- images
create index idx_images_listing       on public.listing_images(listing_id, position);

-- messaging (inbox queries sort by recency)
create index idx_conv_seller          on public.conversations(seller_id, last_message_at desc);
create index idx_conv_buyer           on public.conversations(buyer_id, last_message_at desc);
create index idx_messages_conv        on public.messages(conversation_id, created_at desc);
create index idx_messages_unread      on public.messages(conversation_id) where read_at is null;

-- discovery / trust / safety
create index idx_saved_user           on public.saved_searches(user_id);
create index idx_saved_notify         on public.saved_searches(user_id) where notify;
create index idx_fav_user             on public.favorites(user_id, created_at desc);
create index idx_verif_user_type      on public.verification_requests(user_id, type);
create unique index uq_eid_hash       on public.verification_requests(eid_number_hash)
                                       where eid_number_hash is not null;  -- one Emirates ID = one account
create index idx_admin_actions_target on public.admin_actions(target_type, target_id, created_at desc);
create index idx_user_roles_lookup    on public.user_roles(user_id, role);

-- reports (110015 shape)
create index idx_reports_status        on public.reports(status, created_at desc);
create index idx_reports_reporter      on public.reports(reporter_id);
create index idx_reports_listing       on public.reports(listing_id)
                                        where listing_id is not null;
create index idx_reports_reported_user on public.reports(reported_user_id)
                                        where reported_user_id is not null;

-- orders / offers (110019)
create index idx_orders_buyer  on public.orders(buyer_id, updated_at desc);
create index idx_orders_seller on public.orders(seller_id, updated_at desc);
create index idx_orders_conv   on public.orders(conversation_id);
create index idx_offers_order  on public.offers(order_id, created_at);
create index idx_offers_conv   on public.offers(conversation_id, created_at);

-- reviews (110022)
create index idx_reviews_reviewee on public.reviews(reviewee_id, created_at desc);
create index idx_reviews_listing  on public.reviews(listing_id);

-- notifications (110023)
create index idx_notifications_user   on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id) where read_at is null;

-- admin ops (110026)
create index idx_audit_created  on public.admin_audit_log(created_at desc);
create index idx_ai_mod_created on public.ai_moderation_log(created_at desc);

-- engagement logs (110027–110029)
create index idx_listing_views_user     on public.listing_views(user_id, viewed_at desc);
create index idx_search_log_created     on public.search_log(created_at desc);
create index idx_search_log_query_lower on public.search_log(lower(query));
create index idx_feedback_created       on public.feedback(created_at desc);
