# db/ — Self-Managed PostgreSQL Baseline (Migration Phase 1)

Artifacts for building the **target** database in the Supabase → self-managed
migration ([MIGRATION_BLUEPRINT.md](../MIGRATION_BLUEPRINT.md),
[MIGRATION_TASKS.md](../MIGRATION_TASKS.md) Phase 1).

**Nothing in this directory touches the running app or the Supabase database.**
The live schema source of truth remains `supabase/migrations/` until cutover;
any new Supabase migration must be mirrored here (and in
`prisma/schema.prisma`) in the same PR.

## Files & apply order

| # | File | Run as | Contents |
|---|---|---|---|
| 1 | `baseline/0000_extensions.sql` | superuser | pgcrypto, postgis, vector, pg_trgm, citext |
| 2 | `baseline/0001_schema.sql` | migrator role | Net public schema: 12 enums, 27 tables, 5 portable functions, 10 triggers, 45 indexes — with every Supabase-ism stripped (no auth.users FK, no RLS, no grants, no auth-coupled functions; checklist in MIGRATION_BLUEPRINT.md §2.1) |
| 3 | `baseline/0002_auth_tables.sql` | migrator role | New app-owned auth tables: `auth_credentials`, `auth_accounts`, `auth_verification_tokens`, `auth_phone_otps` (design: TARGET_ARCHITECTURE.md §3.1) |
| 4 | `seed.sql` | app or migrator | Category tree (post-110017, no `jobs`) + `marketplace_settings` singleton. Idempotent |

```bash
psql "$TARGET_DATABASE_URL" -f db/baseline/0000_extensions.sql   # superuser
psql "$TARGET_DATABASE_URL" -f db/baseline/0001_schema.sql
psql "$TARGET_DATABASE_URL" -f db/baseline/0002_auth_tables.sql
psql "$TARGET_DATABASE_URL" -f db/seed.sql
```

## Provenance & verification status

- Authored 2026-07-06 from the net state of the 32 files in
  `supabase/migrations/`, cross-checked against the field-level audit that
  validated `prisma/schema.prisma` (see prisma/README.md "Audit status").
- **Applied successfully to a scratch PostgreSQL 17.10** (embedded binaries,
  2026-07-06): all four files ran without error, seed re-run confirmed
  idempotent, and functional smoke tests passed — citext case-insensitive
  unique email, `trg_listings_count` (+1 on active insert, −1 on sold),
  `touch_updated_at`, the generated `search_vector` tsvector (FTS query
  matched), `trg_user_reports_count`, the auth-table CHECK constraints, and
  user-delete cascades across profiles/listings/auth_credentials.
  Object counts: 31 tables (27 + 4 auth), 12 enums, 11 triggers, 28 seeded
  categories, 1 settings row.
- **pgvector lines verified separately on PGlite** (WASM Postgres with real
  pgvector, 2026-07-06): `create extension vector`, the
  `listing_embeddings.embedding vector(1024)` column and the
  `idx_embeddings_ivf` ivfflat index applied **verbatim**, and a live
  cosine-distance (`<=>`) query returned correctly.
- **Still unverified on a server — PostGIS only** (3 lines): the
  `create extension postgis` install, the `listings.location
  geography(Point,4326)` column, and the `idx_listings_geo` GIST index. They
  are transcribed 1:1 from migrations already running in production Supabase;
  the diff below confirms them at reconciliation time.
- **Live-DB reconciliation: CLEAN (2026-07-07).** `scripts/diff-schema.ts` was
  run with SOURCE = the production Supabase database and TARGET = an embedded
  PG 17.10 built from these files (`ALLOW_MISSING_POSTGIS_VECTOR=1`, see
  script header). All 270 columns (types/nullability/defaults), 12 enums
  (including value order), every constraint (including FK ON DELETE actions),
  every index definition, all triggers and all kept function bodies match the
  live database exactly. Note: `prisma db pull` cannot introspect the live DB
  (P4002: the `public.users → auth.users` cross-schema FK) — the pg_catalog
  diff is the reconciliation of record and covers strictly more.
- **Full apply on real PostGIS + pgvector: CLEAN (2026-07-07).** All four
  files applied **completely unmodified** (no strips, no waivers) on a
  disposable Docker container (`imresamu/postgis:17-3.5`, an arm64 rebuild of
  the official PostGIS image, + `postgresql-17-pgvector`). Confirmed the three
  previously-untested PostGIS/vector constructs are created exactly as written:
  `listings.location geography(Point,4326)`, `listing_embeddings.embedding
  vector(1024)`, the `idx_listings_geo` GIST index, and the `idx_embeddings_ivf`
  ivfflat index. `npm run diff:schema` was then re-run against production with
  **NO** `ALLOW_MISSING_POSTGIS_VECTOR` waiver: clean, zero unexpected
  differences. **The baseline is now fully verified end to end.**
- **Reconciliation side-finding:** the live database does NOT contain
  migration `20260702120000_phone_verification` (`sync_phone_verified`,
  `guard_phone_verified`, `trg_guard_phone_verified` are absent) — the
  migration exists only locally and was never `db push`ed. The baseline is
  unaffected (those objects are deliberately excluded), but the app's phone
  verification feature has no DB support in production until it is pushed.
- The blueprint's preferred baseline source is a `pg_dump` of the live
  database (§2.1); this authored version stands in until credentials are
  available, and the dump comparison then confirms or corrects it.

## Deliberate differences vs the Supabase schema

- `users.id` is a plain `uuid primary key` — the FK to `auth.users(id)` is
  gone; the signup transaction supplies the id (TARGET_ARCHITECTURE.md §3.3).
- Dropped, replaced by app code: `handle_new_user`, `sync_email_verified`,
  `sync_phone_verified`, `ensure_self_profile`, `guard_phone_verified`, the
  RLS helpers (`has_role`, `is_staff`, `is_admin`,
  `is_conversation_participant`), all RLS policies, all storage/realtime
  objects, all role grants.
- Kept counter/touch functions lose `security definer` (there is no RLS left
  to bypass; they become plain functions).
- The 110026 admin-role-by-email seed is an ops runbook step, not in seed.sql.
