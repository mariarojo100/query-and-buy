# Migration Blueprint — Supabase → Self-Managed PostgreSQL

**Project:** Query & Buy (Next.js 15 / TypeScript / Vercel)
**Date:** 2026-07-06 · **Status:** Blueprint only — no production code has been changed.

| Doc | Contents |
|---|---|
| [SUPABASE_DEPENDENCY_MAP.md](SUPABASE_DEPENDENCY_MAP.md) | As-is inventory: every file, table, enum, trigger, RPC, policy, bucket, env var |
| [TARGET_ARCHITECTURE.md](TARGET_ARCHITECTURE.md) | To-be design: Drizzle, Auth.js, S3 storage, app-level authz |
| **This file** | The plan: schema / auth / storage / authz / data migration / phases / estimates |
| [MIGRATION_TASKS.md](MIGRATION_TASKS.md) | File-by-file rewrite roadmap as a phased checklist |
| [RISK_AND_ROLLBACK_PLAN.md](RISK_AND_ROLLBACK_PLAN.md) | Testing checklist, rollback per phase, risk register |

---

## 0. Executive summary

Query & Buy uses Supabase for four things: **Postgres hosting**, **Auth (GoTrue)**, **Storage**, and a small amount of **Realtime**. Authorization is 100% RLS. The migration is very tractable because:

- **Zero `.rpc()` calls and zero `auth.admin.*` calls** in app code — the DB API surface is plain CRUD through PostgREST.
- **User IDs are preserved** (`public.users.id` already mirrors `auth.users.id`), so no FK rewrites in data.
- **Supabase password hashes are bcrypt** and exportable → users keep their passwords.
- Realtime surface is 2 components; storage surface is 3 upload components + 1 delete + a URL builder.
- The hard part is mechanical but wide: ~60 RLS policies must become explicit query filters across ~45 server files, and 3 `auth.users` triggers must become app-level transactions.

**Estimated effort: 26–34 developer-days (one senior full-stack dev), risk level MEDIUM overall** (HIGH concentrated in the authz rewrite and data cutover — see §12 and RISK doc).

---

## 1. Full Supabase dependency map

See [SUPABASE_DEPENDENCY_MAP.md](SUPABASE_DEPENDENCY_MAP.md). Headline numbers:

- 5 client factories + 2 inline clients; ~45 server files on the user-scoped client, 13 on the service-role client, 6 client components on the browser client.
- 27 tables, 12 enums (2 orphaned), 15 functions, 14 triggers (3 on `auth.users`), ~60 RLS policies, 2 storage buckets, realtime publication on 5 tables.
- Extensions: `pgcrypto`, `postgis`, `vector`, `pg_trgm`, `citext` — the self-managed host **must** provide these (rules out some managed offerings' lowest tiers; verify before choosing a host).

---

## 2. PostgreSQL schema migration plan

### 2.1 Strategy: baseline squash, not replay

Do **not** replay the 32 Supabase migrations (they reference `auth.users`, `storage.buckets`, and contain a drop/recreate of `reports`). Instead:

1. **Generate a baseline** from the live Supabase DB: `supabase db dump --schema public` (or `pg_dump -n public --schema-only`). This captures the *net* schema including all alterations.
2. **Strip Supabase-isms** from the baseline (checklist):
   - `create extension` lines → keep, but move to a superuser bootstrap script (`0000_extensions.sql`).
   - FK `users.id → auth.users(id)` → drop the REFERENCES clause (users becomes root).
   - Functions `handle_new_user`, `sync_email_verified`, `sync_phone_verified`, `ensure_self_profile`, `guard_phone_verified` → **omit** (replaced by app code, §3).
   - Helper functions `has_role`, `is_staff`, `is_admin`, `is_conversation_participant` → omit (app-level now).
   - All `create policy` / `alter table ... enable row level security` → omit (see §5; optionally re-add a reduced hardening set later).
   - `grant`s to `anon`/`authenticated`/`service_role` roles → omit.
   - Realtime publication statement → omit.
   - `app.trust_write` GUC references → gone with the functions above.
3. **Keep verbatim**: all tables/columns/defaults/CHECKs, all enums (drop orphaned `report_reason`/`report_status` or keep for safety — recommend keep, zero cost), generated `search_vector` column, all indexes, `touch_updated_at` + both counter trigger sets (`trg_listings_count*`, `trg_user_reports_count*`) — these are portable plain Postgres.
4. **Author the Drizzle schema** (`lib/db/schema/`) to *match* the baseline — introspect with `drizzle-kit pull`, then hand-fix custom types (`geography`, `vector`, `citext` via `customType`). The SQL baseline is authoritative; Drizzle schema is for typed queries. New migrations from then on via `drizzle-kit generate` + hand-written SQL where needed.
5. **New auth tables** (`auth_credentials`, `auth_accounts`, `auth_verification_tokens`, `auth_phone_otps`) added as the first new migration — see TARGET_ARCHITECTURE §3.1.
6. **Seed**: port migration 110010 categories + 110026 `marketplace_settings` insert into a `seed.sql`/`drizzle` seed script (idempotent, as today). The admin-role seed by email becomes an ops runbook step.

### 2.2 Verification

`scripts/diff-schema.ts`: dump both DBs' `information_schema` + `pg_indexes` + trigger list and diff; must be empty except the intentional deletions above. (Detailed checks in RISK doc testing checklist.)

---

## 3. Auth replacement plan (Supabase Auth → Auth.js v5)

Design details in TARGET_ARCHITECTURE §3. Plan of record:

### 3.1 Components to build

| # | Component | Replaces |
|---|---|---|
| A1 | `lib/auth/config.ts` — Auth.js with Credentials + Google providers, JWT sessions | GoTrue core |
| A2 | `app/api/auth/[...nextauth]/route.ts` | `/auth/callback` PKCE exchange |
| A3 | `lib/auth/session.ts` — `getViewer()` | 60+ `auth.getUser()` sites |
| A4 | `lib/auth/signup.ts` — transactional user-bundle creator (users + profiles + username + user_roles + credentials) | `handle_new_user` trigger + `ensure_self_profile` RPC |
| A5 | Email verification: token issue/verify + `/auth/confirm` route + Resend template | GoTrue confirmation emails + `verifyOtp` + `sync_email_verified` trigger |
| A6 | Password reset: token flow + existing `/forgot-password`, `/reset-password` pages rewired | `resetPasswordForEmail` + `updateUser({password})` |
| A7 | Phone OTP via Twilio Verify + transactional flag write | `updateUser({phone})` + phone `verifyOtp` + `sync_phone_verified` + `guard_phone_verified` |
| A8 | `middleware.ts` on Auth.js — same `PROTECTED_PREFIXES`, `redirectTo`, login-bounce | `utils/supabase/middleware.ts` |
| A9 | Google `signIn` callback: account linking by verified email; first-login bundle creation with OAuth display name/avatar | `handle_new_user` OAuth-metadata branch |

### 3.2 Credential migration (why users keep passwords)

Supabase stores bcrypt in `auth.users.encrypted_password`. Export via direct Postgres connection (`select id, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at, raw_user_meta_data from auth.users`), load into `auth_credentials.password_hash`. `bcrypt.compare()` verifies these natively. Google identities export from `auth.identities` (`provider='google'`, `provider_id` = Google `sub`) → `auth_accounts` rows, so returning Google users link silently.

Edge cases to handle in the export script: users with OAuth-only accounts (no password — `encrypted_password` null → no `auth_credentials` row; they must use Google or password-reset), unconfirmed emails (map to `has_email_verified=false`, they'll be re-prompted), banned/deleted states (map `users.status`).

### 3.3 Sequencing note

Auth is **not** swapped independently of the DB: Auth.js reads/writes the new tables via Drizzle. The build order in §13 therefore does DB plumbing first, auth second, and keeps both behind a branch/preview until cutover — Supabase remains untouched in production the whole time.

---

## 4. Storage replacement plan

Design in TARGET_ARCHITECTURE §4. Plan of record:

1. Build `lib/storage/` driver (S3-compatible; R2 recommended for egress pricing; MinIO for local dev or a `local.ts` disk driver).
2. Create buckets `avatars`, `listing-images` (public read) on the target; enforce the 2 MB/5 MB + MIME limits **in the presign action** (S3 can't express Supabase's bucket-level MIME allowlist; presign with `ContentType` condition + server-side validation).
3. Replace 3 browser-upload components with the presign flow (server action `getUploadUrls` → browser PUT). Key convention unchanged.
4. Replace the one server-side delete (`app/account/listings/actions.ts`) with `storage.remove()` via driver + key-prefix ownership assert.
5. Rewrite `lib/storage.ts#publicUrl` → `NEXT_PUBLIC_STORAGE_BASE_URL`; 11 consumer files need no signature change.
6. Update `next.config.ts` (images remotePatterns, CSP `connect-src`/`img-src`).
7. **Object copy** (data migration §7): Supabase Storage exposes an S3-compatible endpoint → `rclone sync supabase-s3:avatars r2:avatars` (both buckets). Verify object counts + spot-check bytes.
8. **URL rewrite**: `update profiles set avatar_url = replace(avatar_url, '<old-supabase-host>/storage/v1/object/public/', '<new-base>/')` in the data-migration script. `listing_images.storage_key` needs nothing.

---

## 5. RLS → application-authorization plan

Principles and module design in TARGET_ARCHITECTURE §5. **Complete policy translation table** — each row becomes a repository function/filter + a test:

| # | RLS policy | Repository translation |
|---|---|---|
| 1 | `users_self_read` | `getMyAccount(viewer)` — `where id = viewer.id`; staff variant in system repo |
| 2 | `users_self_update` | `updateMyAccount(viewer, patch)` — column allowlist, `where id = viewer.id` |
| 3 | `profiles_public_read` | `getProfile*(...)` — no viewer filter (public) |
| 4 | `profiles_owner_write` / `insert` | `updateMyProfile(viewer, patch)` — allowlist **excluding** `phone_verified`, `email_verified`, `rating_*`, `listings_count`, `reports_count`, `badge_level`, `trust_score` |
| 5 | `roles_read` / `roles_admin_write` | `getMyRoles(viewer)`; role grants only in `system/adminRepo` behind `requireAdmin` |
| 6 | `categories_public_read` | `listCategories({includeInactive: viewer.isStaff})` |
| 7 | `categories_admin_write` | admin repo only |
| 8 | `listings_read` + `listings_order_participant_read` | `listingVisibleWhere(viewer)`: `status='active' AND deleted_at IS NULL` ∨ `seller_id=viewer.id` ∨ staff ∨ `EXISTS(order participant)` — shared fragment used by detail, browse, search, sitemap (sitemap passes `viewer=null` → public branch only) |
| 9 | `listings_owner_insert` | `createListing(viewer,…)` sets `seller_id = viewer.id` (never from input) |
| 10 | `listings_owner_update` | `updateListing(viewer, id, patch)` — `where seller_id = viewer.id` (staff via admin repo); status transitions validated (existing lib/listings/status.ts) |
| 11 | `listings_owner_delete` | soft-delete in same shape |
| 12 | `images_read` / `images_owner_write` | images always joined through a visible/owned listing; writes assert parent `seller_id = viewer.id` in-transaction |
| 13 | `price_read` | `where user_id = viewer.id OR listing.seller_id = viewer.id` (+staff) |
| 14 | `conv_participant_read/update`, `conv_buyer_insert` | `where buyer_id = viewer.id OR seller_id = viewer.id`; `startConversation` sets `buyer_id = viewer.id`, asserts `buyer ≠ seller` |
| 15 | `msg_participant_read` | join conversations with participant filter (replaces `is_conversation_participant()`) |
| 16 | `msg_participant_send` | transaction: assert participant ∧ `status <> 'blocked'`, insert with `sender_id = viewer.id` |
| 17 | `saved_owner_all`, `fav_owner_all`, `listing_views_owner_all` | every query `where user_id = viewer.id`; upserts pin `user_id = viewer.id` |
| 18 | `verif_owner_read/insert`, `verif_staff_update` | owner filters; review updates in staff repo |
| 19 | `reports_insert` / `reports_select_own` | `submitReport(viewer,…)` pins `reporter_id`; reads owner-only; moderation reads in admin repo (as today via service role) |
| 20 | `admin_actions_*` | staff repo, `admin_id = viewer.id`, no update/delete exported |
| 21 | `orders_*` | participant filter; `createOrder` pins `buyer_id = viewer.id`, asserts distinct; cross-user transitions (accept → reserve listing, complete → sold) stay in the **system repo** exactly where `app/orders/actions.ts` uses the admin client today, wrapped in explicit participant checks + a transaction |
| 22 | `offers_*` | via parent-order participant check in-transaction; `sender_id = viewer.id` |
| 23 | `reviews_public_read` | public |
| 24 | `reviews_participant_insert` | transaction re-validating: order completed ∧ viewer is buyer/seller ∧ reviewee is counterpart ∧ listing matches (mirror the policy predicate exactly) |
| 25 | `reviews_owner_update` | `where reviewer_id = viewer.id` |
| 26 | `notifications_owner_read/update` | `where user_id = viewer.id`; inserts only via `system/notificationsRepo` (dispatch) |
| 27 | `notif_prefs_*` | owner CRUD |
| 28 | `admin_audit_read`, `ai_mod_read` | admin repo behind `requireAdmin` |
| 29 | `settings_public_read` | public read; writes admin repo |
| 30 | `feedback_insert` (anon ok) / `feedback_admin_read` | `submitFeedback(viewer|null,…)`; reads admin repo |
| 31 | Deny-all tables (embeddings, email_failures, search_log) | repos only under `lib/db/system/` |
| 32 | Storage object policies (path₁ = uid) | presign action generates keys under `viewer.id/`; delete asserts prefix |

**Test rule:** every row above gets at least one "allowed" and one "denied" integration test (see RISK doc). The denied tests are the ones that catch regressions RLS used to absorb silently.

---

## 6. Environment variable replacement plan

| Action | Variable | Notes |
|---|---|---|
| REMOVE | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | last usage deleted in Phase 7 |
| ADD | `DATABASE_URL` | pooled (pgbouncer/RDS proxy) for serverless; add `DIRECT_DATABASE_URL` for migrations if pooled |
| ADD | `AUTH_SECRET`, `AUTH_URL` | Auth.js core |
| ADD | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | reuse the existing Google OAuth app; **add the new redirect URI** `https://<site>/api/auth/callback/google` alongside the Supabase one during transition |
| ADD | `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_REGION`, `NEXT_PUBLIC_STORAGE_BASE_URL` | S3/R2/MinIO |
| ADD | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | phone OTP |
| KEEP | `ADMIN_EMAILS`, `GEMINI_API_KEY`, `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` | unchanged |

Update `.env.example`, Vercel project env (Preview env gets the new stack first — that *is* the staging environment), and `.github/workflows/ci.yml` comment/secrets.

---

## 7. Data migration strategy

Preserving all IDs makes this a copy, not a transform. Two datasets: Postgres rows and storage objects.

### 7.1 Dry runs first

The whole §7 runs end-to-end against a staging target **at least twice** before production cutover; the script must be idempotent (truncate-and-reload or fresh DB each run).

### 7.2 Steps (production cutover)

1. **Freeze writes** (~30–60 min window): enable `marketplace_settings.maintenance_mode` + deploy a maintenance gate, or pause traffic at Vercel. Announce beforehand.
2. **Export auth**: SQL over direct connection — `auth.users` (id, email, encrypted_password, email/phone confirmations, raw_user_meta_data, banned/deleted) and `auth.identities` (google provider_id). Write to CSV/ndjson. **Handle secrets carefully: encrypted_password dumps are credentials — encrypt at rest, delete after load.**
3. **Export public schema data**: `pg_dump -n public --data-only --disable-triggers` (disable-triggers avoids double-firing counter triggers; counters are already-correct data).
4. **Load target**: apply baseline schema (§2) → load data dump → load auth exports into `users`-adjacent auth tables (`auth_credentials`, `auth_accounts`) → rewrite `profiles.avatar_url` hosts (§4.8).
5. **Reconcile counters/sequences**: no serial sequences exist (all uuid/composite PKs) — verify anyway; re-run `recount_seller_listings`/`recount_user_reports` for all rows as a checksum.
6. **Storage sync**: final `rclone sync` (incremental — a first full sync happens days earlier, so the delta is small).
7. **Verify** (scripted): row counts per table match; sample checksums (e.g. `md5(string_agg(id::text, ',' order by id))` per table); one test login with a known password account; one Google login; images render.
8. **Cutover**: flip Vercel env vars to the new stack, deploy the migrated branch, lift maintenance mode.
9. **Supabase project → paused, not deleted** (rollback anchor, RISK doc).

### 7.3 What is deliberately lost

Supabase Auth audit log, refresh-token table (all sessions invalidated — users log in again once), unconfirmed pending email-change states, and any in-flight email OTPs. All acceptable for this product; sessions-invalidated should be in the announcement.

---

## 8. File-by-file rewrite roadmap

See [MIGRATION_TASKS.md](MIGRATION_TASKS.md) — every file from the dependency map assigned to a phase with its target shape.

## 9. Testing checklist & 10. Rollback plan

See [RISK_AND_ROLLBACK_PLAN.md](RISK_AND_ROLLBACK_PLAN.md).

---

## 11. Estimated effort

Assumes one senior full-stack developer, familiar with Next.js, new to this codebase’s internals (these docs close that gap).

| Phase | Work | Days |
|---|---|---|
| P0 | Infra: Postgres host + extensions, R2/MinIO, Twilio, staging env | 2 |
| P1 | Schema baseline + Drizzle schema + seed + diff verification | 3–4 |
| P2 | Data-access layer skeleton + authz module + lint fence | 2 |
| P3 | Auth.js: providers, signup bundle, email verify, password reset, phone OTP, middleware | 5–6 |
| P4 | Repository rewrite of all queries/actions (the ~45 S-files + 13 A-files) | 7–9 |
| P5 | Storage driver + presign flow + URL builder + next.config | 2–3 |
| P6 | Realtime → polling; sitemap; verify script; CI scripts | 1 |
| P7 | Data-migration scripts + 2 staged dry runs | 2–3 |
| P8 | Test suite for §5 policy matrix + E2E pass + fixes | 3–4 |
| P9 | Production cutover + hypercare | 1 |
| | **Total** | **26–34** |

Add ~20% if the team picks Prisma (raw-SQL fallbacks for geography/vector/FTS) or if a second engineer needs onboarding.

## 12. Risk level

**Overall: MEDIUM.** Highest-risk items (full register + mitigations in RISK doc):

1. **Authorization regressions** (HIGH) — an RLS rule silently not translated → data leak. Mitigated by the §5 catalog + mandatory allow/deny test pairs + choke-point lint.
2. **Auth cutover** (MEDIUM-HIGH) — password-hash import, Google account linking, all-sessions logout.
3. **Data cutover window** (MEDIUM) — mitigated by dry runs + freeze + verification script + pause-not-delete rollback.
4. **Serverless DB connections** (MEDIUM) — Vercel + self-managed PG needs pooling (pgbouncer/RDS Proxy) from day one.
5. **Search/geo parity** (LOW-MEDIUM) — generated tsvector + GIN/GIST ported verbatim; verify query plans on staging.

---

## 13. Recommended phased implementation order

Phases P0–P8 all happen on a branch + Vercel Preview against staging infra; **production keeps running on Supabase untouched until P9**. Order rationale: schema first (everything depends on it), auth before the query rewrite (repositories need `Viewer`), storage independent (parallelizable), data migration rehearsed early and often.

```
P0 Infra           ──┐
P1 Schema baseline ──┤→ P2 DAL+authz skeleton → P3 Auth.js ─┐
                     │                                       ├→ P4 Repository rewrite → P8 Tests → P9 Cutover
                     └────────── P5 Storage (parallel) ──────┘
P6 Realtime/misc (anytime after P2)
P7 Data-migration dry runs (start after P1; repeat before P9)
```

Definition of done per phase is in [MIGRATION_TASKS.md](MIGRATION_TASKS.md); go/no-go gates for P9 are in [RISK_AND_ROLLBACK_PLAN.md](RISK_AND_ROLLBACK_PLAN.md).
