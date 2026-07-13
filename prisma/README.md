# Prisma Foundation (Migration Phase 1 — schema only)

Part of the Supabase → self-managed PostgreSQL migration described in
[MIGRATION_BLUEPRINT.md](../MIGRATION_BLUEPRINT.md). This directory adds the
**Prisma schema foundation only**. Read this before touching anything here.

## Current status

| What | State |
|---|---|
| Runtime data access | **Still 100% Supabase** (`@supabase/ssr` clients, RLS, Storage, Auth). No app code imports `@prisma/client` or the generated client. |
| `prisma/schema.prisma` | The **target** database schema: the 27 ported Supabase tables + 12 enums (declared in `supabase/migrations/` `20260624110001` → `20260702120000`) **plus the 4 target-only auth tables** (`auth_credentials`, `auth_accounts`, `auth_verification_tokens`, `auth_phone_otps` — added in Phase 3, defined in `db/baseline/0002_auth_tables.sql`). The 27 tables match live Supabase; the 4 auth tables do not exist there yet (they are created on the target). This matches `db/baseline` exactly. |
| `prisma.config.ts` (repo root) | Prisma 7 config. `DATABASE_URL` is read from the environment with a harmless placeholder fallback so schema-only commands work with no DB. |
| Generated client | `lib/generated/prisma/` — **gitignored**; regenerate with `npm run prisma:generate`. Generation is verified in CI-able form (typecheck passes with it present). |
| `DATABASE_URL` | Template entry in `.env.example`. Used only by Prisma CLI tooling; the running app ignores it. |

## Commands

```bash
npm run prisma:validate    # schema sanity check (no DB needed)
npm run prisma:format      # canonical formatting
npm run prisma:generate    # regenerate client into lib/generated/prisma
```

The Supabase CLI scripts (`db:push`, `db:diff`, …) remain the **only** way schema
changes reach the live database for now. Do **not** run `prisma migrate` /
`prisma db push` against the Supabase database — Prisma must stay read-only
toward Supabase until cutover (MIGRATION_TASKS.md Phase 9).

## Modeling decisions (do not "fix" these without reading)

1. **`updatedAt` fields are `@default(now())`, not `@updatedAt`.** The database
   maintains `updated_at` via `touch_updated_at()` triggers. Using `@updatedAt`
   would silently move that behavior into the client and diverge from every
   non-Prisma writer during the transition.
2. **`User.id` has no default.** Today the id comes from `auth.users` (Supabase
   Auth) via the `handle_new_user` trigger. After the auth migration the
   signup transaction supplies it (see TARGET_ARCHITECTURE.md §3).
3. **The `users.id → auth.users(id)` FK is not modeled** — it exists in the
   live DB but is Supabase-only and is dropped in the target schema
   (MIGRATION_BLUEPRINT.md §2.1). This is the one *intentional* diff against a
   `prisma db pull` of the current database.
4. **`Unsupported(...)` columns:** `listings.location`
   (`geography(Point,4326)`, PostGIS), `listings.search_vector` (GENERATED
   tsvector), `listing_embeddings.embedding` (`vector(1024)`). Prisma can hold
   but not query them; reads/writes touching them need `$queryRaw`. They are
   optional in the model so `create()` calls remain possible.
5. **Free-text status columns kept free-text** (`orders.status`,
   `offers.status`, `reports.reason/status`) to match the live DB exactly.
   Hardening to enums is a flagged post-migration follow-up, not part of the
   mirror.
6. **Orphaned enums `report_reason` / `report_status` are modeled** — they
   still exist in the database (the 110015 reports rewrite left them behind),
   and modeling them keeps a live-DB diff clean.
7. **Naming:** camelCase fields / PascalCase models with `@map` / `@@map` to
   the existing snake_case names. Column and constraint names in the database
   are unchanged.
8. **Every relation carries an explicit `onUpdate: NoAction`** (and
   `user_roles.granted_by` / `verification_requests.reviewed_by` also carry
   `onDelete: NoAction`). The SQL migrations never specify referential
   actions beyond ON DELETE, so Postgres uses NO ACTION — but Prisma's
   *implicit* defaults (`onUpdate: Cascade`, and `onDelete: SetNull` on
   optional relations) differ. Without the explicit spelling, a
   `prisma migrate diff` would flag every FK.

## Audit status

The schema was cross-checked field-by-field (columns, types, nullability,
defaults, PK/UNIQUE, FK targets incl. every users-vs-profiles reference, ON
DELETE actions, plain btree indexes incl. column order and sort direction)
against the net result of all 32 files in `supabase/migrations/` on
2026-07-06. All 17 discrepancies found were fixed in the same pass.

**Live-database reconciliation (2026-07-07): CLEAN.** Note that
`prisma db pull` itself cannot introspect the live Supabase database — it
fails with P4002 on the `public.users → auth.users` cross-schema FK (the very
coupling this migration removes; the error disappears once the FK is dropped
on the target). Reconciliation was therefore performed with the strictly more
thorough `npm run diff:schema` (pg_catalog level: columns, enums, constraints
incl. FK actions, indexes, triggers, function bodies) against production —
zero unexpected differences. See db/README.md for details and one
side-finding (migration 20260702120000 not yet pushed to production).

## Out-of-schema inventory (lives in SQL, invisible to Prisma)

When this schema is eventually used to build the target database (Phase 1 of
MIGRATION_TASKS.md), these must be applied as raw SQL migrations alongside it:

- **Generated column expression** for `listings.search_vector` (bilingual
  setweight/to_tsvector — see migration `110004`).
- **Indexes Prisma can't express:** GIN FTS on `search_vector`; trigram GIN on
  `profiles.display_name`; JSONB GIN on `listings.attributes`; GIST on
  `listings.location`; ivfflat on `listing_embeddings.embedding`; all ~15
  partial indexes (active listings, unread, urgent, featured, `uq_eid_hash`,
  …); expression index on `lower(search_log.query)`. Full list:
  SUPABASE_DEPENDENCY_MAP.md §5.9.
- **CHECK constraints:** `price_fils >= 0`, `amount_fils >= 0`,
  `orders_distinct`, `reports_has_target`, `settings_singleton`, rating range,
  review length, feedback kind/length, reviewer_role.
- **Portable triggers:** `touch_updated_at` set (8 tables),
  `trg_listings_count_aiud`, `trg_user_reports_count_aiud`,
  `trg_guard_phone_verified`.
- **Supabase-only objects that will NOT be ported** (replaced by app code per
  the blueprint): `handle_new_user`, `sync_email_verified`,
  `sync_phone_verified`, `ensure_self_profile`, RLS policies, storage
  policies, realtime publication.

## Verifying the mirror against a live database

Before this schema drives any migration work, reconcile it against reality:

```bash
# 1. Point DATABASE_URL at the Supabase database (read-only credentials).
# 2. Introspect into a scratch copy and diff:
npx prisma db pull --print > /tmp/introspected.prisma
# 3. Compare with prisma/schema.prisma. Expected diffs ONLY:
#    - the auth.users FK on users.id (intentionally unmodeled)
#    - Unsupported(...) spellings / index details Prisma normalizes
#    - anything under "Out-of-schema inventory" above
```

Any other diff means this mirror drifted (e.g. a new `supabase/migrations/`
file landed) — update `schema.prisma` in the same PR as any new Supabase
migration from now on.
