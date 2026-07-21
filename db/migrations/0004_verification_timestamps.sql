-- ============================================================================
-- 0004_verification_timestamps — audit timestamps for email/phone verification.
-- Run AFTER db/baseline/* on existing databases (idempotent):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0004_verification_timestamps.sql
--
-- The verified STATE remains the existing booleans (users.has_email_verified,
-- users.has_mobile_verified, mirrored on profiles) — the trust/authz system
-- reads those and is unchanged. These columns add "when" for audit/support,
-- written alongside the booleans by lib/db/auth#markEmailVerified /
-- markPhoneVerified. Additive + nullable: no data is rewritten, no backfill.
-- Mirrors User.emailVerifiedAt / User.phoneVerifiedAt in prisma/schema.prisma.
-- ============================================================================

alter table public.users
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz;

-- Optional, NON-destructive backfill for already-verified accounts (kept
-- commented so applying this migration never changes existing data). Uncomment
-- to stamp historical verifications with a best-effort time:
-- update public.users set email_verified_at = updated_at
--   where has_email_verified = true and email_verified_at is null;
-- update public.users set phone_verified_at = updated_at
--   where has_mobile_verified = true and phone_verified_at is null;
