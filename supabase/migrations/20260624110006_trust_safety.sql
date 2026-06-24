-- ============================================================================
-- 20260624110006_trust_safety
-- Discovery, trust and safety tables: saved_searches, favorites,
-- verification_requests, reports, admin_actions.
-- Source: database-design.md §2.10–§2.14
-- ============================================================================

-- ---------- 2.10 saved_searches ----------
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

-- ---------- 2.11 favorites (M:N user <-> listing) ----------
create table public.favorites (
  user_id    uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- 2.12 verification_requests (trust ladder / lean KYC) ----------
create table public.verification_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  type         verification_type not null,
  status       verification_status not null default 'pending',
  source       text,                                  -- 'uae_pass' | 'otp' | 'manual_doc'
  eid_number_hash text,                               -- HMAC for one-ID-one-account dedupe
  doc_front_key   text,                               -- private Storage bucket key
  doc_back_key    text,
  metadata     jsonb,                                 -- non-PII verification metadata
  reviewed_by  uuid references public.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index uq_eid_hash on public.verification_requests(eid_number_hash)
  where eid_number_hash is not null;             -- enforce one Emirates ID = one account
create trigger trg_verif_touch before update on public.verification_requests
  for each row execute function public.touch_updated_at();

-- ---------- 2.13 reports ----------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id) on delete set null,  -- nullable: survives reporter deletion (§3)
  target_type report_target not null,
  target_id   uuid not null,                          -- polymorphic (listing/user/message)
  reason      report_reason not null,
  details     text,
  status      report_status not null default 'open',
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- 2.14 admin_actions (append-only staff audit trail) ----------
create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.users(id) on delete set null,  -- nullable: survives actor deletion (§3)
  action      admin_action_type not null,
  target_type report_target,
  target_id   uuid,
  reason      text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
