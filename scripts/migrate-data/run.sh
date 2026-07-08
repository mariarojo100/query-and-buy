#!/usr/bin/env bash
# ============================================================================
# Data migration runbook: Supabase → self-managed PostgreSQL.
# Executes the cutover data move (MIGRATION_BLUEPRINT.md §7). IDs are preserved,
# so every FK survives untouched. Run inside the maintenance/write-freeze window.
#
# Required env:
#   SOURCE_DATABASE_URL   Supabase Postgres (direct connection, read-only user ok)
#   TARGET_DATABASE_URL   the new self-managed Postgres
#   SOURCE_SUPABASE_URL   https://<ref>.supabase.co  (for avatar URL rewrite)
#   NEXT_PUBLIC_STORAGE_BASE_URL  target storage host (for avatar URL rewrite)
#
# Storage objects (both buckets) are copied separately with rclone against the
# Supabase S3-compatible endpoint — do a full sync days earlier, then a final
# incremental `rclone sync --checksum` inside the freeze. See README.md.
# ============================================================================
set -euo pipefail
: "${SOURCE_DATABASE_URL:?}" "${TARGET_DATABASE_URL:?}"
DUMP="${TMPDIR:-/tmp}/qb-public-data.sql"

echo "== 1/5 apply baseline schema to target =="
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f db/baseline/0000_extensions.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f db/baseline/0001_schema.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f db/baseline/0002_auth_tables.sql
# NOTE: do NOT run db/seed.sql here — categories + settings come from the data
# dump below with their real ids. seed.sql is only for a fresh, data-less target.

echo "== 2/5 dump + load public-schema DATA (triggers disabled, ids preserved) =="
pg_dump "$SOURCE_DATABASE_URL" --schema=public --data-only --disable-triggers \
  --no-owner --no-privileges > "$DUMP"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$DUMP"

echo "== 3/5 migrate auth state (credentials, google accounts, verified flags) =="
node --import tsx scripts/migrate-data/migrate-auth.ts

echo "== 4/5 rewrite avatar URLs → target storage host =="
node --import tsx scripts/migrate-data/rewrite-avatar-urls.ts

echo "== 5/5 verify (row counts, checksums, credential fidelity) =="
node --import tsx scripts/migrate-data/verify.ts

echo "== data migration complete =="
