# Migration Tasks — File-by-File Roadmap

> Phased checklist executing [MIGRATION_BLUEPRINT.md](MIGRATION_BLUEPRINT.md). Every Supabase-touching
> file from [SUPABASE_DEPENDENCY_MAP.md](SUPABASE_DEPENDENCY_MAP.md) appears exactly once below.
> All work happens on branch `migrate/self-hosted` + Vercel Preview against staging infra.
> Production stays on Supabase until Phase 9.
>
> Conventions: **NEW** = file created · **REWRITE** = same path, new internals, same exported
> signatures where possible · **DELETE** = removed at the listed phase (never earlier).

---

## Phase 0 — Infrastructure (no repo changes except docs) — ~2d

- [ ] Provision staging + production PostgreSQL 17 with `pgcrypto postgis vector pg_trgm citext`; roles `queryandbuy_app` (DML), `queryandbuy_migrator` (DDL); connection pooler (pgbouncer transaction mode or provider equivalent).
- [ ] Provision object storage (R2 recommended): buckets `avatars`, `listing-images`, public read, custom domain → this becomes `NEXT_PUBLIC_STORAGE_BASE_URL`. MinIO (or local driver) for local dev.
- [ ] Twilio Verify service for phone OTP.
- [ ] Google Cloud Console: add redirect URI `https://<preview-and-prod>/api/auth/callback/google` to the existing OAuth app (keep Supabase URI until P9+stabilization).
- [ ] Vercel: create the new env vars on Preview scope only (list in BLUEPRINT §6).
- [ ] First full `rclone sync` of both buckets (delta re-sync happens at cutover).

## Phase 1 — Schema baseline — ~3–4d

> **Decision 2026-07-06: Prisma chosen over Drizzle** (owner's call; the +2–3d
> raw-SQL overhead from TARGET_ARCHITECTURE §2 is priced into this phase).

- [x] **NEW** `db/baseline/0000_extensions.sql` — extension installs (superuser). *(done 2026-07-06)*
- [x] **NEW** `db/baseline/0001_schema.sql` — net `public` schema stripped per BLUEPRINT §2.1 checklist (no auth.users FK, no auth-coupled functions/triggers, no RLS, no grants; keeps touch/counter triggers + all 45 indexes + 12 enums, 27 tables). *(done 2026-07-06 — authored from migrations, NOT yet applied to a server or diffed against a live pg_dump; see db/README.md)*
- [x] **NEW** `db/baseline/0002_auth_tables.sql` — `auth_credentials`, `auth_accounts`, `auth_verification_tokens`, `auth_phone_otps` (TARGET_ARCHITECTURE §3.1). *(done 2026-07-06)*
- [x] **NEW** `db/seed.sql` — categories tree (port migration 110010) + `marketplace_settings` singleton (110026), idempotent. *(done 2026-07-06)*
- [x] **NEW** `prisma/schema.prisma` — full mirror of current schema, field-level audited against all 32 migrations; Postgres-only features documented in prisma/README.md. *(done 2026-07-06)*
- [x] **NEW** `prisma.config.ts`; `package.json` scripts `prisma:validate`, `prisma:format`, `prisma:generate` (Supabase `db:*` scripts untouched until P9). *(done 2026-07-06)*
- [x] Apply `db/baseline/*.sql` + `db/seed.sql` to a scratch Postgres 17. *(done 2026-07-06 on embedded PG 17.10 — all files applied, triggers/FTS/citext/cascades smoke-tested green; pgvector lines additionally verified verbatim on PGlite incl. a live ivfflat cosine query. Only the 3 PostGIS lines — extension, `listings.location`, `idx_listings_geo` GIST — remain server-untested; they are transcribed 1:1 from migrations that already run in production, and `diff:schema` will confirm them at reconciliation time. See db/README.md)*
- [x] **NEW** `scripts/diff-schema.ts` — pg_catalog diff Supabase↔target (tables/columns/enums/constraints/indexes/triggers/functions) with the deliberate deviations allowlisted; `npm run diff:schema`. *(authored 2026-07-06; needs SOURCE_DATABASE_URL + TARGET_DATABASE_URL to execute)*
- [x] Live-DB reconciliation. *(done 2026-07-07 — `npm run diff:schema` with SOURCE = production Supabase, TARGET = embedded PG built from db/baseline: **clean**, zero unexpected differences across columns/enums/constraints/indexes/triggers/functions. `prisma db pull` itself is unusable against Supabase — P4002 on the `public.users → auth.users` cross-schema FK — so the pg_catalog diff is the reconciliation of record. Side-finding: live DB is missing migration `20260702120000_phone_verification`; see db/README.md)*

- [x] Apply the baseline UNMODIFIED on a PostGIS + pgvector server. *(done 2026-07-07 on Docker `imresamu/postgis:17-3.5` + `postgresql-17-pgvector`: all four files applied with no strips, the geography/vector columns and GIST/ivfflat indexes created as written, and `npm run diff:schema` vs production re-run with NO waiver — clean.)*

**Phase 1 status: COMPLETE.** Baseline verified end to end against production; nothing deferred.

## Phase 2 — Data-access + authz skeleton — ~2d

> **COMPLETE (2026-07-07).** All files are scaffolding — nothing is imported by
> any runtime path; the app still runs on Supabase. `check:boundaries` +
> `typecheck` + `build` all green. Prisma (not Drizzle) per the P1 decision.

- [x] **NEW** `lib/db/index.ts` — Prisma 7 client singleton (node-postgres driver adapter, lazy so importing needs no `DATABASE_URL`, dev hot-reload global cache).
- [x] **NEW** `lib/authz/viewer.ts` — `Viewer` type + `deriveViewer()`; ports `is_staff()`/`is_admin()` + the `ADMIN_EMAILS` gate (pure, no I/O). Plus `lib/db/viewer.ts` — the DB-backed `loadViewer(id,email)` (the Auth.js/Phase-3 seam).
- [x] **NEW** `lib/authz/policies.ts` — one typed Prisma `where` fragment per RLS read-policy (`listingVisibleWhere` incl. the 110020 order-participant rule, `conversationVisibleWhere`, `messageVisibleWhere`, `orderParticipantWhere`, `offerVisibleWhere`, `ownedByViewer`, `reportOwnedWhere`). Plus `lib/db/listings.ts` — an example repository that type-proves the fragments.
- [x] **NEW** `lib/db/system/` — folder + documented allowlist for ex-service-role repositories.
- [x] **NEW** import fence — `scripts/check-db-boundaries.mjs` (dependency-free stand-in for ESLint `no-restricted-imports`, since the repo lints with `tsc`): raw client → `lib/db/**` only; `lib/db/system` → allowlist; generated client → `lib/db/**` + `lib/authz/**`. Wired into `npm run check:boundaries` and CI. Negative-tested (catches all three; allows repository imports).
- [x] **NEW** `postinstall: prisma generate` so fresh clones / CI / Vercel produce the git-ignored client before type-checking; READMEs in `lib/db/` and `lib/authz/`.

## Phase 3 — Auth.js — ~5–6d

> **Foundation slice COMPLETE (2026-07-07); wiring deferred.** Per the "Foundation
> only" scope decision, the non-wired auth *logic* + DB writers are built and
> functionally tested (19/19 assertions on a real Postgres: signup bundle,
> duplicate-email, password verify, single-use tokens, reset flow, $2a$ hash
> portability, OAuth bundle, phone OTP, both-table verified-flag writes). The
> Auth.js provider config, route handler, middleware/actions/components, and
> Twilio/Resend send calls remain unbuilt — they are the runtime wiring and are
> intentionally out of this session's non-destructive scope.

**Done — foundation (new files, nothing wired):**
- [x] **NEW** `lib/db/auth.ts` — auth-table repositories + transactional `createUserAccount` bundle (users+profiles+username+user_roles+credentials/oauth, fails loudly — replaces `handle_new_user`) + `markEmailVerified` / `markPhoneVerified` (replace the `sync_*` triggers) + token & phone-OTP ops.
- [x] **NEW** `lib/auth/password.ts` — bcryptjs hash/verify (verifies Supabase `$2a$` hashes).
- [x] **NEW** `lib/auth/tokens.ts` — hashed single-use email-verify / reset tokens (issue, redeem, expire).
- [x] **NEW** `lib/auth/signup.ts` — `registerWithPassword`, `beginPasswordReset`, `completePasswordReset`.
- [x] **NEW** `lib/auth/phone.ts` — phone-OTP state machine (replaces Supabase phone OTP).
- [x] **NEW** auth models added to `prisma/schema.prisma` (AuthCredential/AuthAccount/AuthVerificationToken/AuthPhoneOtp) + `lib/auth/README.md`.

**To do — wiring (NOT this session; needs Auth.js + Twilio/Resend, touches runtime):**
- [ ] **NEW** `lib/auth/config.ts` — Auth.js v5: Credentials (vs `lib/auth/password`) + Google; JWT sessions; `jwt`/`signIn` callbacks (Google link-by-email or `createUserAccount` bundle).
- [ ] **NEW** `app/api/auth/[...nextauth]/route.ts`.
- [ ] **NEW** `lib/auth/session.ts` — `getViewer()` over the session (uses `lib/db/viewer#loadViewer`), replaces every `auth.getUser()`.
- [ ] **REWRITE** `app/(auth)/actions.ts` — signup/login/logout/forgot/reset on the new stack (call `lib/auth/signup`); same exported action names.
- [ ] **REWRITE** `app/auth/confirm/route.ts` — redeem email token (`lib/auth/tokens`) + `markEmailVerified`.
- [ ] **DELETE (P3)** `app/auth/callback/route.ts` — superseded by Auth.js route.
- [ ] **REWRITE** `components/auth/GoogleSignInButton.tsx` — `signIn('google', …)`.
- [ ] **REWRITE** `middleware.ts` + **DELETE** `utils/supabase/middleware.ts` — Auth.js middleware, same `PROTECTED_PREFIXES`.
- [ ] **REWRITE** `app/account/verifyPhone/actions.ts` — Twilio Verify send + `lib/auth/phone#verifyPhoneCode`.
- [ ] **REWRITE** `lib/admin/gate.ts` — `getViewer()`-based; keep `ADMIN_EMAILS` + `forbidden()` semantics.
- [ ] **NEW** email templates in `lib/email/templates.ts` for verify-email and reset-password.

## Phase 4 — Repository rewrite (largest phase) — ~7–9d

Order within phase: query libs first (leaf dependencies), then actions, then pages.

> **In progress (test-as-I-go).** A persistent local target Postgres (Docker,
> from `db/baseline`) + `tests/authz/` harness verify allow AND deny per domain.
> `npm run test:authz` (needs `DATABASE_URL` → local target DB). Done so far
> (53 assertions, all incl. cross-user deny): **favorites** (12),
> **saved-searches** (12), **notifications + preferences** (10),
> **account/profiles** (14 — incl. the column-allowlist proof: trust/verified
> columns unreachable via profile update), **reports** (3), **feedback** (2).

### 4a. Query libraries → repositories

| Task | File | Notes |
|---|---|---|
| [x] DONE | `lib/listings/queries.ts` | → `lib/db/listings.ts` (`listingVisibleWhere`, raw-SQL FTS, favorites-count via groupBy); listings.test.ts 19/19 incl. draft/reserved visibility + order-participant |
| [x] DONE | `lib/favorites/queries.ts` | → `lib/db/favorites.ts` (Viewer-scoped); tests/authz/favorites.test.ts 12/12 |
| [x] DONE | `lib/messaging/queries.ts` + `app/messages/actions.ts` | → `lib/db/messaging.ts` (participant scoping; send asserts participant + not-blocked); messaging.test.ts 17/17 incl. no-leak thread read |
| [ ] REWRITE | `lib/orders/queries.ts` | participant filters |
| [ ] REWRITE | `lib/reviews/queries.ts` | public reads + owner bits; completed-order counts become plain queries |
| [ ] REWRITE | `lib/reputation/queries.ts` | → `lib/db/system/reputation.ts` (cross-user aggregates, unchanged semantics) |
| [ ] REWRITE | `lib/personalization/queries.ts` | owner filter on listing_views |
| [x] DONE | `lib/savedSearches/queries.ts` | → `lib/db/savedSearches.ts`; savedSearches.test.ts 12/12 |
| [x] DONE | `lib/notifications/queries.ts`, `lib/notifications/preferences.ts` | → `lib/db/notifications.ts`; notifications.test.ts 10/10 |
| [ ] REWRITE | `lib/notifications/dispatch.ts` | → system repo insert |
| [ ] REWRITE | `lib/email/send.ts` | only the `email_failures` insert changes (system repo) |
| [ ] REWRITE | `lib/search/intelligence.ts` | search_log system repo; trending/typeahead plain queries |
| [ ] REWRITE | `lib/safety/moderation-log.ts` | system repo |
| [ ] REWRITE | `lib/account/activity.ts` | owner filters |
| [ ] REWRITE | `lib/admin/queries.ts` | behind `requireAdmin`; same KPIs via Drizzle (`bucketByDay` → SQL `date_trunc`) |

### 4b. Server actions

| Task | File | Notes |
|---|---|---|
| [ ] REWRITE | `app/sell/actions.ts` | createListing/updateListing in transactions (listing + images rows) |
| [ ] REWRITE | `app/sell/aiActions.ts` | only client swap (categories read) |
| [ ] REWRITE | `app/messages/actions.ts` | sendMessage transaction asserts participant + not-blocked (RLS #16) |
| [ ] REWRITE | `app/orders/actions.ts` | negotiation engine → `lib/db/system/orders.ts` with explicit participant asserts + transactions around cross-entity transitions (offer accept → order + listing reserved; complete → sold) — this is the file needing the most care in the whole migration |
| [ ] REWRITE | `app/favorites/actions.ts`, `app/saved-searches/actions.ts`, `app/notifications/actions.ts`, `app/feedback/actions.ts`, `app/reports/actions.ts` | owner-pinned CRUD |
| [ ] REWRITE | `app/reviews/actions.ts` | submitReview transaction re-validating order state (RLS #24) |
| [ ] REWRITE | `app/account/actions.ts` | profile update with column allowlist (RLS #4) |
| [ ] REWRITE | `app/account/listings/actions.ts` | status changes + image diff; storage delete via driver (P5 dependency) |
| [ ] REWRITE | `app/listing/actions.ts` | recordView: view_count bump becomes plain `update … set view_count = view_count + 1` (no service role needed) |
| [ ] REWRITE | `app/search/actions.ts` | client swap + logSearch via system repo |
| [ ] REWRITE | `app/admin/actions.ts` | all mutations behind `requireAdmin` + audit-log writes, via admin/system repos |

### 4c. Pages / layouts / components with direct usage

- [ ] REWRITE `app/page.tsx`, `app/category/[slug]/page.tsx`, `app/listing/[id]/page.tsx`, `app/listing/[id]/edit/page.tsx`, `app/sell/page.tsx`, `app/messages/page.tsx`, `app/messages/[conversationId]/page.tsx`, `app/favorites/page.tsx`, `app/saved-searches/page.tsx`, `app/notifications/page.tsx`, `app/account/{page,layout}.tsx`, `app/account/settings/page.tsx`, `app/account/reviews/page.tsx`, `app/admin/layout.tsx`, `app/u/[username]/page.tsx`, `components/layout/SiteHeader.tsx` — swap `auth.getUser()`→`getViewer()` and inline queries→repositories. Mostly mechanical.
- [ ] REWRITE `app/sitemap.ts` — plain Drizzle queries with `viewer=null` public filters (works at build/ISR time; no cookies needed).

## Phase 5 — Storage (parallel with P3/P4) — ~2–3d

> **Foundation slice COMPLETE (2026-07-07); wiring deferred.** The non-wired
> storage abstraction is built at `lib/object-storage/` (not `lib/storage/` —
> the live `lib/storage.ts` file would collide; it takes the `lib/storage` name
> at cutover). Offline-tested 18/18: MIME/size validation (2 MB / 5 MB), key
> conventions, the `keyBelongsToUser` ownership rule (former storage RLS), and
> real presigned-PUT generation. The presign server action, component rewrites,
> and next.config/CSP changes are runtime wiring, out of this session's scope.

**Done — foundation (new files, nothing wired):**
- [x] **NEW** `lib/object-storage/driver.ts` (`StorageDriver` interface) + `s3.ts` (S3/R2/MinIO driver) + `keys.ts` (buckets, key builders, validation, ownership) + `index.ts` (lazy driver singleton + pure `publicUrl`) + README. Env vars added to `.env.example`.

**To do — wiring (NOT this session; touches runtime):**
- [ ] **NEW** `app/uploads/actions.ts` — `getUploadUrls(bucket, files[])`: auth, `validateUpload`, keys under `viewer.id/…` (`keyBelongsToUser`), presigned PUTs.
- [ ] **REWRITE** `components/sell/CreateListingForm.tsx`, `components/listing/EditListingForm.tsx`, `components/profile/AvatarUploader.tsx` — presign + `fetch PUT`; drop browser supabase client.
- [ ] **RENAME/REWRITE** `lib/storage.ts` → adopt `lib/object-storage` under the `lib/storage` name; `publicUrl()` on `NEXT_PUBLIC_STORAGE_BASE_URL`. (11 consumer files: import path only.)
- [ ] **REWRITE** `next.config.ts` — images remotePatterns → new storage host (keep `lh3.googleusercontent.com`); CSP `connect-src` drop `*.supabase.co`/`wss://*.supabase.co`, add storage host.

## Phase 6 — Realtime & misc — ~1d

- [ ] **REWRITE** `components/realtime/ConversationRealtime.tsx` — visibility-aware 5s poll → `router.refresh()`.
- [ ] **REWRITE** `components/notifications/NotificationBell.tsx` — 30s poll / refresh-on-nav.
- [ ] **NEW** `scripts/verify-db.ts` (replaces `scripts/verify-supabase.ts`): DB ping, extension check, storage HEAD, Auth.js secret sanity.
- [ ] **REWRITE** `.env.example` — new variable set (BLUEPRINT §6).
- [ ] **REWRITE** `.github/workflows/ci.yml` — typecheck + (new) policy-test job with a Postgres service container.

## Phase 7 — Data-migration tooling (start early, rerun often) — ~2–3d

- [ ] **NEW** `scripts/migrate-data/01-export-auth.sql` + runner — auth.users + auth.identities export (BLUEPRINT §3.2 edge cases).
- [ ] **NEW** `scripts/migrate-data/02-load.ts` — schema apply, `pg_dump --data-only --disable-triggers` load, auth-table load, `profiles.avatar_url` host rewrite.
- [ ] **NEW** `scripts/migrate-data/03-verify.ts` — row counts, per-table id-checksums, counter recount comparison, sample credential bcrypt check.
- [ ] Dry run #1 against staging; fix; dry run #2 clean.

## Phase 8 — Test suite & E2E — ~3–4d

- [ ] Policy matrix tests: one allow + one deny per row of BLUEPRINT §5 table (32 rows), against a seeded test DB.
- [ ] Auth E2E: signup→verify-email→login; imported-bcrypt login; Google first-login (bundle creation) + returning (link); forgot/reset; phone OTP; middleware redirects (all 7 prefixes + redirectTo + login bounce).
- [ ] Full manual regression pass per RISK doc checklist.

## Phase 9 — Cutover — ~1d + hypercare

- [ ] Execute BLUEPRINT §7.2 runbook (freeze → export → load → sync → verify → flip env → deploy → unfreeze).
- [ ] **DELETE (post-stabilization only, ~2 weeks):** `utils/supabase/` (remaining files), `lib/supabase/client.ts`, `scripts/verify-supabase.ts`, `@supabase/*` from package.json, `db:*` supabase scripts, archive `supabase/` dir into `db/legacy-supabase/`; pause (don't delete) the Supabase project.

---

### Explicitly out of scope (follow-ups, not migration)

- Hardening free-text `orders.status` / `offers.status` / `reports.*` into enums.
- Consolidating the duplicated verification flags between `users` and `profiles`.
- pgvector similar-listings feature (schema ported; still has no app consumer).
- SSE/LISTEN-NOTIFY realtime upgrade (only if polling UX is insufficient).
