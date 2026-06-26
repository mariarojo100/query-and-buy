-- ============================================================================
-- 20260624110026_admin_ops
-- Sprint 10 — admin portal operations. Additive only; no existing marketplace
-- behaviour changes. Admin reads/writes run through the service-role client and
-- are gated by is_admin(); admin-only tables also enforce is_admin() via RLS.
-- ============================================================================

-- ---------- featured listings ----------
alter table public.listings
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until timestamptz;

create index if not exists idx_listings_featured on public.listings(is_featured) where is_featured;

-- ---------- moderation: notes + message reports ----------
alter table public.reports
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists admin_notes text;

-- ---------- admin audit log ----------
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;
create policy admin_audit_read on public.admin_audit_log
  for select using (public.is_admin());

-- ---------- AI moderation log ----------
create table if not exists public.ai_moderation_log (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid references public.listings(id) on delete set null,
  source         text not null default 'listing',  -- listing | upload | message
  decision       text not null,                     -- allowed | blocked | flagged
  confidence     numeric,
  reason         text,
  human_override text,                               -- null | approved | rejected
  created_at     timestamptz not null default now()
);
create index if not exists idx_ai_mod_created on public.ai_moderation_log(created_at desc);

alter table public.ai_moderation_log enable row level security;
create policy ai_mod_read on public.ai_moderation_log
  for select using (public.is_admin());

-- ---------- marketplace settings (singleton) ----------
create table if not exists public.marketplace_settings (
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
insert into public.marketplace_settings (id) values ('global') on conflict do nothing;

alter table public.marketplace_settings enable row level security;
-- Public can read settings (maintenance banner, brand); only the service role writes.
create policy settings_public_read on public.marketplace_settings
  for select using (true);

create trigger trg_settings_touch before update on public.marketplace_settings
  for each row execute function public.touch_updated_at();

-- ---------- seed an initial admin ----------
insert into public.user_roles (user_id, role)
select id, 'admin' from public.users where email = 'maria@rojojose.com'
on conflict (user_id, role) do nothing;
