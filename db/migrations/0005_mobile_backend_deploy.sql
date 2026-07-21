-- ============================================================================
-- 0005_mobile_backend_deploy — every DB object the mobile /api/v1 backend needs,
-- in ONE idempotent, additive script. Safe to run on an existing production DB
-- (re-runnable; creates only what's missing, never drops or rewrites data).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0005_mobile_backend_deploy.sql
--
-- Consolidates the idempotent form of:
--   • db/baseline/0002_auth_tables.sql   (auth_credentials/accounts/tokens/otps)
--   • db/migrations/0003_api_tables.sql   (refresh_tokens/push_tokens/blocked_users)
--   • db/migrations/0004_verification_timestamps.sql (users.*_verified_at)
--
-- Requires the base schema (db/baseline/0001): public.users +
-- public.touch_updated_at(). Prod already has these. Definitions mirror
-- prisma/schema.prisma exactly.
-- ============================================================================

-- ── App-owned auth tables (idempotent form of baseline/0002) ────────────────

create table if not exists public.auth_credentials (
  user_id       uuid primary key references public.users(id) on delete cascade,
  password_hash text not null,
  updated_at    timestamptz not null default now()
);
-- touch_updated_at trigger — drop+create so it's re-runnable
drop trigger if exists trg_auth_credentials_touch on public.auth_credentials;
create trigger trg_auth_credentials_touch before update on public.auth_credentials
  for each row execute function public.touch_updated_at();

create table if not exists public.auth_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  provider            text not null,
  provider_account_id text not null,
  created_at          timestamptz not null default now(),
  unique (provider, provider_account_id)
);
create index if not exists idx_auth_accounts_user on public.auth_accounts(user_id);

create table if not exists public.auth_verification_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in ('email_verify', 'password_reset')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_auth_tokens_user on public.auth_verification_tokens(user_id, type);

create table if not exists public.auth_phone_otps (
  user_id    uuid primary key references public.users(id) on delete cascade,
  phone_e164 text not null,
  code_hash  text not null,
  attempts   smallint not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ── Mobile /api/v1 support tables (from 0003) ───────────────────────────────

create table if not exists public.refresh_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  token_hash      text not null unique,
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  rotated_from_id uuid,
  created_at      timestamptz not null default now()
);
create index if not exists refresh_tokens_user_id_idx on public.refresh_tokens (user_id);

create table if not exists public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  token        text not null unique,
  platform     text not null,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
create index if not exists blocked_users_blocked_id_idx on public.blocked_users (blocked_id);

-- ── Verification audit timestamps (from 0004) ───────────────────────────────

alter table public.users
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz;
