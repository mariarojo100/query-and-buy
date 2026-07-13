-- ============================================================================
-- 0003_api_tables — mobile /api/v1 support tables.
-- Run AFTER db/baseline/* on existing databases (idempotent):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0003_api_tables.sql
-- Mirrors the RefreshToken / PushToken / BlockedUser models in
-- prisma/schema.prisma exactly (same names, types, defaults, indexes).
-- ============================================================================

-- Rotating refresh tokens for the mobile token flow (lib/api/tokens.ts).
-- Stores only sha256 hashes; rotated_from_id links the rotation chain so a
-- reused (already-rotated) token can revoke the whole chain.
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

-- Expo push tokens per device (lib/notifications/push.ts).
create table if not exists public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  token        text not null unique,
  platform     text not null,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

-- User blocks (App Store UGC requirement).
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
create index if not exists blocked_users_blocked_id_idx on public.blocked_users (blocked_id);
