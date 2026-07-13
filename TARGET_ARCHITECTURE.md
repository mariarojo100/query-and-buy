# Target Architecture — Query & Buy (post-Supabase)

> Companion to [SUPABASE_DEPENDENCY_MAP.md](SUPABASE_DEPENDENCY_MAP.md) (as-is) and
> [MIGRATION_BLUEPRINT.md](MIGRATION_BLUEPRINT.md) (how to get there).
> This document describes the **to-be** system. It is a design document only — no code changes yet.

---

## 1. Stack summary

| Concern | Today (Supabase) | Target |
|---|---|---|
| Database | Supabase-hosted Postgres 17 | Self-managed **PostgreSQL 17** (VM / RDS / Neon-style — must support `postgis`, `vector`, `pg_trgm`, `citext`, `pgcrypto`) |
| ORM / query layer | `supabase-js` PostgREST client | **Drizzle ORM** (recommended — see §2) with `drizzle-kit` migrations + raw-SQL migration files for triggers/extensions |
| Auth | Supabase Auth (GoTrue) | **Auth.js v5 (NextAuth)** — Credentials (email/password, bcrypt) + Google provider, JWT session strategy |
| Session transport | Supabase cookies via `@supabase/ssr` | Auth.js encrypted JWT cookie (`authjs.session-token`) |
| Authorization | RLS policies (`auth.uid()`, `is_staff()`, `is_admin()`) + service-role bypass | **Application-level authorization**: a data-access layer (`lib/db/`) + policy module (`lib/authz/`) — see §5 |
| Storage | Supabase Storage (2 public buckets) | **S3-compatible object storage** (R2 recommended; S3/MinIO/local-disk driver for dev) behind a storage abstraction (`lib/storage/`) with presigned uploads |
| Realtime | Supabase Realtime (`postgres_changes`) | **Polling first** (interval `router.refresh()`), optional upgrade: Postgres `LISTEN/NOTIFY` → SSE route handler |
| Email | Resend (unchanged) | Resend (unchanged) — now also sends **verification + password-reset emails** (Supabase Auth used to) |
| SMS OTP | Supabase Auth phone change flow | Direct **Twilio Verify** (or similar) called from a server action |
| Hosting | Vercel | Vercel (unchanged) — DB/storage move only |

---

## 2. ORM choice: Drizzle (recommended) vs Prisma

> **DECISION 2026-07-06: Prisma.** The owner chose Prisma; the foundation
> (`prisma/schema.prisma`, `prisma.config.ts`, audited mirror) is in place.
> The comparison below is retained for the record — the Drizzle-specific
> items elsewhere in this doc read as "Prisma + raw-SQL migrations" instead.

The schema is Postgres-maximalist: PostGIS `geography(Point,4326)`, `vector(1024)`, `citext`, a **generated tsvector column**, GIN/GIST/ivfflat and ~15 partial indexes, 11 portable triggers, and enum types.

| Criterion | Drizzle | Prisma |
|---|---|---|
| PostGIS / pgvector / citext | `customType` + community pgvector support; stays in schema file | `Unsupported("geography")` — columns opaque to the client, raw SQL required anyway |
| Generated columns / partial indexes / triggers | Plain SQL migration files sit next to generated ones (first-class) | Must hand-edit generated migrations; drift-prone |
| Query style | SQL-like, near-1:1 mapping from existing PostgREST query shapes (select/filter/order/limit, `with` for embeds) | Higher-level; fine, but nested writes hide transaction boundaries |
| Serverless/Vercel fit | Single lightweight package + `postgres`/`pg` driver | Needs generated client; heavier cold starts (improved, still bigger) |
| Team familiarity | New either way | New either way |

**Recommendation: Drizzle.** Prisma's `Unsupported(...)` types would force raw SQL for exactly the columns that make this schema interesting; Drizzle keeps one mental model. If the team strongly prefers Prisma, the blueprint still works — substitute "Drizzle schema" with "Prisma schema + hand-maintained SQL migrations" and expect +2–3 developer days.

**Proposed layout:**

```
lib/db/
  index.ts          # drizzle(pgPool) singleton, one for user-scoped, reuse for admin
  schema/           # drizzle schema split by domain (identity, catalog, listings, ...)
  migrations/       # drizzle-kit output + hand-written SQL (triggers, extensions, FTS)
```

Two connection roles mirror today's anon/service-role split *at the app layer only* (single DB role is fine; the split is enforced by the authz layer, not by Postgres roles — see §5.4).

---

## 3. Identity & auth design (Auth.js v5)

### 3.1 Schema: `public.users` becomes the identity root

Today `public.users.id` is an FK to `auth.users(id)`. Target: **drop the FK; `public.users` is the root.** Existing UUIDs are preserved during data migration, so every downstream FK (profiles, listings, orders…) is untouched.

New auth-owned tables (Drizzle-managed):

```
auth_credentials   user_id uuid PK → users(id), password_hash text, updated_at
auth_accounts      (Auth.js "account") provider, provider_account_id, user_id — Google identities
auth_verification_tokens   identifier, token hash, expires, type ('email_verify' | 'password_reset')
auth_phone_otps    user_id, phone_e164, code_hash, expires_at, attempts   -- Twilio-backed phone OTP state
```

Why not reuse the stock Auth.js Drizzle adapter tables wholesale: the Credentials provider doesn't use database sessions anyway, and `public.users`/`profiles` already hold the profile fields. We use Auth.js with a **thin custom adapter** (or no adapter + JWT callbacks) over these tables.

### 3.2 Session strategy: JWT

- Credentials provider requires JWT sessions in Auth.js — that decides it.
- JWT payload: `{ sub: user.id, email, username, isAdmin, emailVerified }`. Keep it small; roles re-checked server-side for admin mutations (defense in depth, mirrors today's `requireAdmin()` which never trusted the token).
- Session read helper `auth()` replaces every `supabase.auth.getUser()` call site. Wrap it once: `lib/auth/session.ts` → `getViewer(): Promise<Viewer | null>` so 60+ call sites depend on our type, not Auth.js's.

### 3.3 Flows (mapping every current auth API)

| Current | Target |
|---|---|
| `auth.signUp` | Server action: validate → hash (bcrypt, cost 12) → **transaction**: insert users + profiles (+username generation) + user_roles + auth_credentials → issue email-verify token → Resend email. This transaction replaces the `handle_new_user` trigger; unlike the trigger it must **fail loudly**, not swallow errors |
| `auth.signInWithPassword` | Auth.js `signIn('credentials')` — verify bcrypt hash (Supabase hashes are bcrypt ⇒ **existing passwords keep working** after data migration, no forced reset) |
| `auth.signInWithOAuth({google})` | Auth.js `signIn('google')`; `signIn` callback links/creates account by verified email; replicates signup bundle for first-time OAuth users (display_name/avatar from Google profile — replaces `handle_new_user` OAuth metadata logic and `ensure_self_profile` self-heal) |
| `auth.exchangeCodeForSession` (app/auth/callback) | Handled internally by Auth.js route handler `app/api/auth/[...nextauth]/route.ts`; our `/auth/callback` route is deleted; `redirectTo`/`next` handling moves to Auth.js `redirect` callback |
| `auth.verifyOtp` (email confirm) | Our own `/auth/confirm` route verifies `auth_verification_tokens`, sets `users.has_email_verified` + `profiles.email_verified` (replaces `sync_email_verified` trigger) |
| `auth.resetPasswordForEmail` | Server action issues `password_reset` token + Resend email → `/reset-password?token=` |
| `auth.updateUser({password})` | Server action: verify token (or live session), update `auth_credentials.password_hash` |
| `auth.updateUser({phone})` + phone `verifyOtp` | Server action pair calling **Twilio Verify**; on success set `users.phone_e164`, `users.has_mobile_verified`, `profiles.phone_verified` in one transaction (replaces `sync_phone_verified` trigger + `guard_phone_verified` GUC handshake — the guard trigger becomes unnecessary because only this action writes the flag) |
| `auth.signOut` | Auth.js `signOut()` |
| Middleware `updateSession` | Auth.js middleware (`auth` wrapper): same `PROTECTED_PREFIXES` list, same `redirectTo` param, same logged-in bounce off /login /signup |

### 3.4 Email/phone verification state

The `users.has_*_verified` / `profiles.*_verified` duplication is kept as-is during migration (changing it mid-migration adds risk); the app-level flows above write both. A post-migration cleanup can consolidate.

---

## 4. Storage design

### 4.1 Abstraction

```
lib/storage/
  index.ts        # StorageDriver interface: put, remove, presignPut, publicUrl
  s3.ts           # S3-compatible driver (R2 / S3 / MinIO — same code, different endpoint env)
  local.ts        # dev driver writing to .storage/ + a /storage/[...key] route (optional)
```

Bucket names and **key conventions stay identical** (`avatars/{userId}/{ts}.{ext}`, `listing-images/{userId}/{group}/{i}.{ext}`) so `listing_images.storage_key` values survive unchanged.

### 4.2 Upload path changes (the only behavioral change)

Today the browser uploads directly to Supabase Storage under RLS. Target: **presigned PUT URLs**.

1. Client component calls a server action `getUploadUrls(bucket, count, contentTypes)`.
2. Action authenticates the viewer, validates MIME/size/count, generates keys under `{viewer.id}/…` (this *is* the old storage RLS policy, now in app code), returns presigned URLs.
3. Browser `fetch(url, {method:'PUT', body:file})` — no SDK needed.
4. Existing flow resumes: keys passed to `createListing` / `updateAvatar` actions.

Deletion (`app/account/listings/actions.ts`) goes through the driver's `remove()` after an ownership check on the key prefix.

### 4.3 Serving

Both buckets are public today; keep that: R2 public bucket / custom domain (or CloudFront/MinIO reverse proxy). `lib/storage.ts#publicUrl` is rewritten to `${NEXT_PUBLIC_STORAGE_BASE_URL}/{bucket}/{key}` — its 11 consumers don't change signature. `next.config.ts` `images.remotePatterns` + CSP updated to the new host. Avatar rows store full URLs, so the **data migration rewrites `profiles.avatar_url`** hosts.

---

## 5. Authorization design (RLS → application layer)

### 5.1 Principles

- **Single choke point.** All queries go through `lib/db/` repositories that require a `Viewer` argument (`{ id, isStaff, isAdmin } | null`). No raw `db` usage in pages/actions — enforced by lint rule (`no-restricted-imports` on `lib/db/index` outside `lib/db/`).
- **RLS policies become repository filters/guards.** Each of the ~60 policies in the dependency map has a named counterpart. The mapping is mechanical because the policies are simple (owner / participant / staff / public).
- **The service-role split becomes explicit function naming**: today's 13 admin-client files map to repository functions suffixed `AsSystem` / placed in `lib/db/system/`, callable only from server code paths that already did this (notifications dispatch, admin actions, order engine cross-user transitions, reputation stats, search logging, email failure log).

### 5.2 Policy translation catalog (representative — full table in MIGRATION_BLUEPRINT §5)

| RLS policy | App-layer equivalent |
|---|---|
| `listings_read` (active ∨ owner ∨ staff) | `listingVisibleWhere(viewer)` composable `WHERE` fragment used by every listing query |
| `listings_order_participant_read` | same fragment ∨ `EXISTS orders(listing, viewer)` |
| `msg_participant_send` (sender=self ∧ participant ∧ not blocked) | `sendMessage(viewer, convId, body)` asserts participant + conversation status in the same transaction as the insert |
| `reviews_participant_insert` (order completed + role cross-check) | `submitReview(viewer, orderId, …)` re-validates order state inside the transaction |
| storage `avatars_owner_insert` (path₁ = uid) | presign action generates keys under `viewer.id/` only |
| deny-all tables (embeddings, email_failures, search_log) | repositories exist only in `lib/db/system/` |

### 5.3 What app-level authz *loses* vs RLS — and the compensations

| Loss | Compensation |
|---|---|
| DB-enforced last line of defense | Lint-enforced choke point; integration tests per policy (RISK doc §Testing); optionally keep a *reduced* set of native RLS policies on the self-managed DB for the most sensitive tables (messages, orders, users) as belt-and-suspenders — deferred decision |
| `guard_phone_verified` trigger guard | Only the phone-verify action writes the flag; `updateProfile` repository has an explicit column allowlist (no spread-into-update) |
| RLS on browser-direct storage writes | Browser never writes storage directly anymore (presign flow) |

### 5.4 Database roles

One app DB role (`queryandbuy_app`) owning DML on `public`; a separate `queryandbuy_migrator` for DDL; superuser only for extension installs. No anon/service split at the DB level — that distinction is an application concept now.

---

## 6. Realtime replacement

Current surface is two components; scale expectations (Phase-1 marketplace) don't justify infrastructure:

- **Phase 1 (cutover): polling.** `ConversationRealtime` → `setInterval(router.refresh, 5000)` while tab visible (Page Visibility API); `NotificationBell` → 30s interval or refresh-on-navigation. Zero new infra, ~30 lines.
- **Phase 2 (optional): SSE.** Route handler `app/api/events/route.ts` holding a `LISTEN` connection (`pg` driver) on channels `conv:{id}` / `notif:{userId}`; portable triggers `NOTIFY` on messages/offers/orders/notifications inserts. Only if polling UX proves insufficient.
- Managed alternatives (Pusher/Ably) only if SSE on Vercel (function duration limits) becomes a problem.

---

## 7. Environment variables (target set)

| Removed | Added |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `DATABASE_URL` (+ `DIRECT_DATABASE_URL` if pooling via pgbouncer) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `AUTH_SECRET`, `AUTH_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| — | `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_REGION`, `NEXT_PUBLIC_STORAGE_BASE_URL` |
| — | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` |

Kept unchanged: `ADMIN_EMAILS`, `GEMINI_API_KEY`, `AI_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`.

---

## 8. Module map (to-be)

```
lib/auth/            # Auth.js config, getViewer(), signup bundle transaction
lib/authz/           # Viewer type, isStaff/isAdmin, policy helpers
lib/db/              # drizzle client, schema, migrations
lib/db/<domain>.ts   # repositories replacing lib/*/queries.ts supabase calls
lib/db/system/       # ex-service-role repositories
lib/storage/         # driver abstraction (replaces lib/storage.ts + browser uploads)
app/api/auth/[...nextauth]/route.ts
middleware.ts        # Auth.js-based (same protected prefixes)
```

Deleted at the end: `utils/supabase/*`, `lib/supabase/client.ts`, `app/auth/callback/route.ts` (folded into Auth.js), `scripts/verify-supabase.ts` (replaced by a `verify-db.ts`), `supabase/` directory (archived), `db:*` npm scripts (replaced by `drizzle-kit` scripts).

---

## 9. What deliberately does NOT change

- Next.js 15 App Router structure, server actions, all UI components' props/rendering.
- Vercel hosting, Resend email, Gemini AI pipeline, `ADMIN_EMAILS` gate semantics.
- Database *logical* schema: tables, columns, enums, portable triggers, counters, indexes, seed data — ported verbatim (plus optional hardening: real enums for orders/offers status — flagged as a follow-up, not part of migration).
- Storage keys and DB references to them.
- User IDs, and therefore every FK relationship — this is what makes the data migration low-drama.
