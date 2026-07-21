#!/usr/bin/env bash
# ============================================================================
# scripts/test-db-setup.sh — build a LOCAL/scratch target DB and run the
# DB-backed suites. NEVER point this at production.
#
# Requires: psql on PATH, and a Postgres that supports postgis + pgvector
# (e.g. a docker `postgis/postgis` + pgvector image, or a Neon scratch branch).
#
# Usage:
#   export DATABASE_URL="postgresql://user:pass@localhost:5432/qb_test"
#   bash scripts/test-db-setup.sh              # build schema + seed, then test
#   bash scripts/test-db-setup.sh --no-tests   # just build the schema + seed
# ============================================================================
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: set DATABASE_URL to a LOCAL/scratch database first." >&2
  exit 2
fi

# Safety: refuse anything that looks like the production Supabase DB. The suites
# TRUNCATE users CASCADE — running that on prod would delete real data.
if [[ "$DATABASE_URL" == *"pooler.supabase.com"* || "$DATABASE_URL" == *".supabase.co"* ]]; then
  echo "REFUSING: DATABASE_URL points at a Supabase host — use a scratch DB, not production." >&2
  exit 3
fi

echo "==> Target: ${DATABASE_URL%%@*}@***"

echo "==> 0000 extensions (needs superuser: pgcrypto, postgis, vector, pg_trgm, citext)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/baseline/0000_extensions.sql
echo "==> 0001 schema"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/baseline/0001_schema.sql
echo "==> 0002 auth tables"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/baseline/0002_auth_tables.sql
echo "==> 0003 api tables"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0003_api_tables.sql
echo "==> 0004 verification timestamps (this feature)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0004_verification_timestamps.sql
echo "==> seed (categories + marketplace_settings, idempotent)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql

if [[ "${1:-}" == "--no-tests" ]]; then
  echo "==> schema + seed applied. Skipping tests (--no-tests)."
  exit 0
fi

echo "==> npm run test:verification"
npm run test:verification
echo "==> npm run test:authz   (regression)"
npm run test:authz
echo "==> npm run test:api      (regression)"
npm run test:api
echo "==> DONE."
