-- ============================================================================
-- 0002_auth_tables.sql — app-owned auth tables replacing Supabase Auth state
-- Part of MIGRATION_TASKS.md Phase 1; design in TARGET_ARCHITECTURE.md §3.1.
-- Run after 0001_schema.sql (references public.users).
--
-- Data sources at migration time (MIGRATION_BLUEPRINT.md §3.2):
--   auth_credentials.password_hash  <- auth.users.encrypted_password (bcrypt)
--   auth_accounts                   <- auth.identities (provider='google',
--                                      provider_account_id = provider_id/sub)
--   auth_verification_tokens        <- none (fresh; in-flight Supabase OTPs
--                                      are deliberately dropped at cutover)
--   auth_phone_otps                 <- none (fresh; Twilio Verify flow)
-- ============================================================================

-- Email/password credential, 1:0..1 with users. OAuth-only accounts have no
-- row here (they sign in via Google or set a password through the reset flow).
create table public.auth_credentials (
  user_id       uuid primary key references public.users(id) on delete cascade,
  password_hash text not null,             -- bcrypt; Supabase hashes verify as-is
  updated_at    timestamptz not null default now()
);

create trigger trg_auth_credentials_touch before update on public.auth_credentials
  for each row execute function public.touch_updated_at();

-- Linked OAuth accounts (Auth.js "account" concept, trimmed to what we use).
-- provider_account_id for Google is the stable `sub` claim.
create table public.auth_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  provider            text not null,       -- 'google' (only provider at launch)
  provider_account_id text not null,
  created_at          timestamptz not null default now(),
  unique (provider, provider_account_id)
);

create index idx_auth_accounts_user on public.auth_accounts(user_id);

-- Single-use tokens for email verification and password reset. Only the
-- SHA-256 hash of the token is stored; the raw token goes into the email link.
create table public.auth_verification_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in ('email_verify', 'password_reset')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index idx_auth_tokens_user on public.auth_verification_tokens(user_id, type);

-- Phone OTP state for the Twilio-backed verification flow (replaces the
-- Supabase Auth phone-change OTP). One active row per user; code_hash is a
-- SHA-256 of the OTP. attempts guards brute force (checked in app code).
create table public.auth_phone_otps (
  user_id    uuid primary key references public.users(id) on delete cascade,
  phone_e164 text not null,
  code_hash  text not null,
  attempts   smallint not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
