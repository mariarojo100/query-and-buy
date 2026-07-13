# Supabase Dependency Map — Query & Buy

> Generated 2026-07-06. Companion documents: [MIGRATION_BLUEPRINT.md](MIGRATION_BLUEPRINT.md),
> [TARGET_ARCHITECTURE.md](TARGET_ARCHITECTURE.md), [MIGRATION_TASKS.md](MIGRATION_TASKS.md),
> [RISK_AND_ROLLBACK_PLAN.md](RISK_AND_ROLLBACK_PLAN.md).
>
> This is the **as-is inventory**. Nothing here prescribes changes; it records every Supabase
> touchpoint so the migration can be executed without guessing.

---

## 1. Package & tooling dependencies

| Dependency | Version | Role |
|---|---|---|
| `@supabase/ssr` | ^0.7 | Cookie-based auth clients (server / browser / middleware) |
| `@supabase/supabase-js` | ^2 | Raw client (service-role admin, sitemap, verify script); types `EmailOtpType`, `User` |
| Supabase CLI (via `npx`) | latest | npm scripts `db:link`, `db:push`, `db:diff`, `db:lint`, `db:reset` |
| `scripts/verify-supabase.ts` | — | `npm run verify` connectivity/key probe |

No AI SDKs (Gemini via raw `fetch`), no email SDK (Resend via raw `fetch`). UI stack (Radix, shadcn, Tailwind 4) has **no** Supabase coupling.

---

## 2. Client plumbing (the 5 factories + 2 inline sites)

| File | Factory | Notes |
|---|---|---|
| [utils/supabase/server.ts](utils/supabase/server.ts) | `createServerClient` (@supabase/ssr) + `next/headers` cookies | Used by ~45 server components / actions / route handlers |
| [utils/supabase/client.ts](utils/supabase/client.ts) | `createBrowserClient` | Used by 6 client components |
| [utils/supabase/middleware.ts](utils/supabase/middleware.ts) | inline `createServerClient` with req/res cookie bridge | `updateSession()`: token refresh on every request; enforces protected prefixes `/account /sell /messages /favorites /saved-searches /notifications /admin`; bounces logged-in users off `/login` `/signup` |
| [utils/supabase/admin.ts](utils/supabase/admin.ts) | raw `createClient` with `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses RLS.** `persistSession:false`. Used by 13 files |
| [lib/supabase/client.ts](lib/supabase/client.ts) | legacy anon singleton | Only consumer: `scripts/verify-supabase.ts` |
| [app/auth/callback/route.ts](app/auth/callback/route.ts) | inline server client | Writes cookies onto redirect response (OAuth PKCE) |
| [app/sitemap.ts](app/sitemap.ts) | inline cookie-less anon client | Build-time/ISR safe (revalidate 3600) |

Root [middleware.ts](middleware.ts) delegates to `updateSession`; matcher excludes static assets.

---

## 3. File-by-file usage table

Client legend: **S** = server (anon + cookies, RLS-scoped) · **B** = browser · **A** = admin/service-role (RLS bypass) · **M** = middleware · **R** = raw supabase-js.

### Auth flows

| File | Client | Supabase surface |
|---|---|---|
| [app/(auth)/actions.ts](app/(auth)/actions.ts) | S | `auth.signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `getUser`, `updateUser({password})` |
| [app/auth/callback/route.ts](app/auth/callback/route.ts) | inline S | `auth.exchangeCodeForSession` (Google OAuth PKCE) |
| [app/auth/confirm/route.ts](app/auth/confirm/route.ts) | S | `auth.verifyOtp({type, token_hash})` (email confirm / recovery links) |
| [components/auth/GoogleSignInButton.tsx](components/auth/GoogleSignInButton.tsx) | B | `auth.signInWithOAuth({provider:'google'})`, redirect `/auth/callback?next=...` |
| [app/account/verifyPhone/actions.ts](app/account/verifyPhone/actions.ts) | S | `auth.updateUser({phone})` + `auth.verifyOtp` (SMS OTP via Supabase Auth) |
| [utils/supabase/middleware.ts](utils/supabase/middleware.ts) | M | `auth.getUser()` per request; route protection |
| [lib/admin/gate.ts](lib/admin/gate.ts) | S | `auth.getUser` + `user_roles` query + `ADMIN_EMAILS` env allowlist; `requireAdmin()` → `redirect`/`forbidden()` |

### Server actions (user-scoped, RLS-dependent)

| File | Client | Tables |
|---|---|---|
| [app/sell/actions.ts](app/sell/actions.ts) | S | categories, listings, listing_images (create/update listing) |
| [app/sell/aiActions.ts](app/sell/aiActions.ts) | S | categories (AI listing generation) |
| [app/messages/actions.ts](app/messages/actions.ts) | S | listings, conversations, messages (start conversation, send, mark read) |
| [app/favorites/actions.ts](app/favorites/actions.ts) | S | favorites (toggle) |
| [app/saved-searches/actions.ts](app/saved-searches/actions.ts) | S | saved_searches (CRUD) |
| [app/notifications/actions.ts](app/notifications/actions.ts) | S | notifications, notification_preferences |
| [app/feedback/actions.ts](app/feedback/actions.ts) | S | feedback |
| [app/reports/actions.ts](app/reports/actions.ts) | S | reports |
| [app/reviews/actions.ts](app/reviews/actions.ts) | S | orders, reviews, profiles, listings |
| [app/account/actions.ts](app/account/actions.ts) | S | profiles (profile edit, avatar URL, username) |
| [app/account/listings/actions.ts](app/account/listings/actions.ts) | S | listings, categories, listing_images **+ `storage.from('listing-images').remove()`** |
| [app/search/actions.ts](app/search/actions.ts) | S (+A via lib/search) | categories; search logging |
| [app/listing/actions.ts](app/listing/actions.ts) | S + A | listing_views (S upsert), listings view_count bump (A) |
| [app/orders/actions.ts](app/orders/actions.ts) | S + A | S: conversations, orders, offers, listings · A: cross-user order/listing status transitions, contact reveal (users + profiles), listing_images. Full negotiation engine |
| [app/admin/actions.ts](app/admin/actions.ts) | A | listings, users, user_roles, reports, reviews, ai_moderation_log, categories, marketplace_settings, notifications, admin_audit_log |

### Query libraries

| File | Client | Tables |
|---|---|---|
| [lib/listings/queries.ts](lib/listings/queries.ts) | S + A | listings, listing_images, categories, profiles; A: favorites counts |
| [lib/favorites/queries.ts](lib/favorites/queries.ts) | S | favorites, profiles |
| [lib/messaging/queries.ts](lib/messaging/queries.ts) | S | conversations, messages, profiles |
| [lib/orders/queries.ts](lib/orders/queries.ts) | S | orders, offers, profiles |
| [lib/reviews/queries.ts](lib/reviews/queries.ts) | S + A | reviews, profiles, orders; A: completed-order counts |
| [lib/reputation/queries.ts](lib/reputation/queries.ts) | A | conversations, messages, orders, listings, profiles (response rate/time) |
| [lib/personalization/queries.ts](lib/personalization/queries.ts) | S | listing_views, listings |
| [lib/savedSearches/queries.ts](lib/savedSearches/queries.ts) | S | saved_searches |
| [lib/notifications/queries.ts](lib/notifications/queries.ts) | S | notifications |
| [lib/notifications/preferences.ts](lib/notifications/preferences.ts) | S | notification_preferences |
| [lib/notifications/dispatch.ts](lib/notifications/dispatch.ts) | A | notifications insert, notification_preferences, profiles, users |
| [lib/email/send.ts](lib/email/send.ts) | A | email_failures |
| [lib/search/intelligence.ts](lib/search/intelligence.ts) | A | search_log, categories, listings (trending, typeahead) |
| [lib/safety/moderation-log.ts](lib/safety/moderation-log.ts) | A | ai_moderation_log |
| [lib/account/activity.ts](lib/account/activity.ts) | S | listings, orders |
| [lib/admin/queries.ts](lib/admin/queries.ts) | A | profiles, users, user_roles, listings, orders, reviews, reports, categories, marketplace_settings, admin_audit_log, ai_moderation_log |

### Pages doing direct auth/queries

[app/page.tsx](app/page.tsx), [app/category/[slug]/page.tsx](app/category/[slug]/page.tsx), [app/listing/[id]/page.tsx](app/listing/[id]/page.tsx), [app/listing/[id]/edit/page.tsx](app/listing/[id]/edit/page.tsx), [app/sell/page.tsx](app/sell/page.tsx), [app/messages/page.tsx](app/messages/page.tsx), [app/messages/[conversationId]/page.tsx](app/messages/[conversationId]/page.tsx), [app/favorites/page.tsx](app/favorites/page.tsx), [app/saved-searches/page.tsx](app/saved-searches/page.tsx), [app/notifications/page.tsx](app/notifications/page.tsx), [app/account/page.tsx](app/account/page.tsx) (S+A), [app/account/layout.tsx](app/account/layout.tsx), [app/account/settings/page.tsx](app/account/settings/page.tsx), [app/account/reviews/page.tsx](app/account/reviews/page.tsx), [app/admin/layout.tsx](app/admin/layout.tsx), [app/u/[username]/page.tsx](app/u/[username]/page.tsx), [app/sitemap.ts](app/sitemap.ts) (R), [components/layout/SiteHeader.tsx](components/layout/SiteHeader.tsx) (S).

### Client components using the browser client

| File | Surface |
|---|---|
| [components/sell/CreateListingForm.tsx](components/sell/CreateListingForm.tsx) | `storage.from('listing-images').upload()` — key `{userId}/{uuid}/{i}.{ext}` |
| [components/listing/EditListingForm.tsx](components/listing/EditListingForm.tsx) | `storage.from('listing-images').upload()` |
| [components/profile/AvatarUploader.tsx](components/profile/AvatarUploader.tsx) | `storage.from('avatars').upload()` + `getPublicUrl()` — key `{userId}/{ts}.{ext}` |
| [components/realtime/ConversationRealtime.tsx](components/realtime/ConversationRealtime.tsx) | realtime channel `conv:{id}` — `postgres_changes` on messages/offers/orders filtered by conversation |
| [components/notifications/NotificationBell.tsx](components/notifications/NotificationBell.tsx) | realtime channel `notif:{userId}` — INSERT on notifications |
| [components/auth/GoogleSignInButton.tsx](components/auth/GoogleSignInButton.tsx) | `auth.signInWithOAuth` |

### Render-only Supabase URL consumers (no client)

`lib/storage.ts` (`publicUrl()` builds `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket}/{key}`) is used by: [app/listing/[id]/page.tsx](app/listing/[id]/page.tsx), [app/messages/[conversationId]/page.tsx](app/messages/[conversationId]/page.tsx), [app/orders/actions.ts](app/orders/actions.ts), [lib/admin/queries.ts](lib/admin/queries.ts), components `home/ContinueNegotiation`, `orders/OrderCard`, `listing/ListingCard`, `listing/ImageGallery`, `listing/EditListingForm`, `account/PremiumListingCard`, `messaging/ConversationListItem`.

---

## 4. Auth API surface (complete)

| Supabase Auth API | Call sites |
|---|---|
| `auth.getUser()` | 60+ sites: middleware + every server action/page above |
| `auth.signUp({email,password})` | app/(auth)/actions.ts |
| `auth.signInWithPassword` | app/(auth)/actions.ts |
| `auth.signOut()` | app/(auth)/actions.ts |
| `auth.resetPasswordForEmail(email, {redirectTo})` | app/(auth)/actions.ts |
| `auth.updateUser({password})` | app/(auth)/actions.ts (reset-password page) |
| `auth.updateUser({phone})` + `auth.verifyOtp` (phone) | app/account/verifyPhone/actions.ts |
| `auth.verifyOtp({type, token_hash})` (email) | app/auth/confirm/route.ts |
| `auth.signInWithOAuth({provider:'google'})` | components/auth/GoogleSignInButton.tsx |
| `auth.exchangeCodeForSession(code)` | app/auth/callback/route.ts |
| `auth.admin.*`, `getSession`, `getClaims`, `onAuthStateChange` | **not used anywhere** |
| `.rpc(...)` | **zero call sites in app code** (helpers exist DB-side only; `ensure_self_profile()` RPC exists in SQL but is not called from app code) |

**Admin determination** is *not* a JWT claim: env allowlist `ADMIN_EMAILS` OR a `user_roles` row (`admin`/`super_admin`), checked in [lib/admin/gate.ts](lib/admin/gate.ts).

**Invisible auth behavior:** `handle_new_user` DB trigger creates `public.users` + `profiles` + `user_roles` on signup — app code never inserts these rows itself.

---

## 5. Database schema inventory

Source of truth: `supabase/migrations/` — **32 files** (`20260624110001`…`110031`, `20260702120000`).

### 5.1 Extensions (migration 110001)

`pgcrypto`, `postgis`, `vector` (pgvector), `pg_trgm`, `citext`. Local config pins **Postgres 17**.

### 5.2 Tables (27)

| Table | Created | Purpose / key columns | Later alterations |
|---|---|---|---|
| `users` | 110002 | Private account state. `id` PK **FK → auth.users ON DELETE CASCADE**, `phone_e164` UNIQUE, `email` citext UNIQUE, `status`, `trust_score`, `has_mobile_verified`, `has_email_verified`, `has_eid_verified`, `flagged`, `deleted_at` | — |
| `profiles` | 110002 | Public seller card, 1:1 with users. `display_name`, `avatar_url`, `bio`, `emirate`, `badge_level`, `rating_avg/count`, `listings_count` (denormalized) | 110012 +`username` citext UNIQUE (nullable in DDL); 110016 +`email_verified`, `phone_verified`, `reports_count` |
| `user_roles` | 110002 | PK (user_id, role app_role), `granted_by` | 110026 seeds admin row |
| `categories` | 110003 | Self-referencing tree; `slug` UNIQUE, bilingual `name_en/name_ar`, `position`, `is_active` | 110010 seed; 110017 removes `jobs` |
| `listings` | 110004 | `seller_id`, `category_id`, bilingual titles, `attributes` jsonb, `price_fils`, `condition`, `status`, `emirate`, `location geography(Point,4326)`, `is_urgent`, `ai_generated`, `view_count`, **generated tsvector `search_vector`** | 110026 +`is_featured`, `featured_until` |
| `listing_images` | 110004 | `storage_key`, `cdn_url`, `position`, dims, `ai_labels`, `is_safe` | — |
| `listing_embeddings` | 110004 | `embedding vector(1024)` — **deny-all RLS, service-role only, not queried by app code** | — |
| `price_suggestions` | 110004 | AI price bands, `comparables` jsonb | — |
| `conversations` | 110005 | UNIQUE (listing_id, buyer_id); unread counters | 110014 +`buyer/seller_last_read_at` |
| `messages` | 110005 | `body`, `attachments` jsonb, `flagged`, `read_at` | — |
| `saved_searches` | 110006 | `query_text`, `parsed_filters` jsonb, `notify` | — |
| `favorites` | 110006 | PK (user_id, listing_id) | — |
| `verification_requests` | 110006 | `type`, `status`, `eid_number_hash` (partial UNIQUE), doc keys | — |
| `reports` | 110006 → **dropped & recreated 110015** | reporter_id FK → profiles; listing_id / reported_user_id targets; free-text reason/status; CHECK has-target | 110026 +`message_id`, `admin_notes` |
| `admin_actions` | 110006 | Append-only staff action log (`admin_action_type`) | — |
| `orders` | 110019 | buyer/seller FK → profiles, `accepted_price_fils`, free-text `status` (negotiating→completed), confirm flags, `contact_revealed`; UNIQUE (listing_id, buyer_id) | 110021 +`completed_at`, `cancelled_at` |
| `offers` | 110019 | per-order offers, `amount_fils`, free-text `status` | — |
| `reviews` | 110022 | UNIQUE (order_id, reviewer_id); rating 1–5; role check buyer/seller | — |
| `notifications` | 110023 | `type/title/body/link/data`, `read_at` | — |
| `email_failures` | 110023 | Resend failure log — **deny-all RLS** | — |
| `notification_preferences` | 110025 | per-user email toggles | — |
| `admin_audit_log` | 110026 | admin action audit (`target_id` is **text**) | — |
| `ai_moderation_log` | 110026 | AI moderation decisions | — |
| `marketplace_settings` | 110026 | singleton row `'global'` (CHECK) | — |
| `listing_views` | 110027 | PK (user_id, listing_id), `viewed_at` | — |
| `search_log` | 110028 | query log — **deny-all RLS** | — |
| `feedback` | 110029 | kind CHECK (bug/feature/general), anonymous allowed | — |

### 5.3 Enums (110001)

`user_status`, `app_role` (user/moderator/admin/super_admin), `emirate` (7 values), `listing_status` (+`reserved` added 110018), `listing_condition`, `verification_type`, `verification_status`, `conversation_status`, `report_target`, `admin_action_type`; **orphaned** after the 110015 reports rewrite: `report_reason`, `report_status`.

### 5.4 Functions

| Function | SEC DEF | Kind | Notes |
|---|---|---|---|
| `touch_updated_at()` | no | trigger fn | sets `updated_at = now()` |
| `has_role(app_role)` / `is_staff()` / `is_admin()` | yes | RLS policy helpers | keyed on `auth.uid()` + `user_roles` |
| `is_conversation_participant(uuid)` | yes | RLS helper | avoids policy recursion on messages |
| `handle_new_user()` | yes | **trigger on auth.users** | bootstraps users+profiles+user_roles; rewritten 4× (110009/12/16/30/31); final version generates username, mirrors OAuth metadata (full_name/avatar), swallows exceptions |
| `recount_seller_listings(uuid)` + `trg_listings_count()` | yes | counter | maintains `profiles.listings_count` |
| `sync_email_verified()` | yes | **trigger on auth.users** | mirrors `email_confirmed_at` → `profiles.email_verified` |
| `recount_user_reports(uuid)` + `trg_user_reports_count()` | yes | counter | maintains `profiles.reports_count` |
| `ensure_self_profile()` | yes | callable RPC (GRANT to authenticated) | self-heal missing rows post-OAuth; **not called from current app code** |
| `guard_phone_verified()` | no | trigger on profiles | reverts `phone_verified` writes unless GUC `app.trust_write='on'` |
| `sync_phone_verified()` | yes | **trigger on auth.users** | mirrors `phone_confirmed_at` → profiles/users flags + `phone_e164` |

### 5.5 Triggers

- **On `auth.users` (Supabase-Auth-coupled — must be replaced by app code):** `on_auth_user_created` → `handle_new_user`; `on_auth_email_confirmed` → `sync_email_verified`; `trg_sync_phone_verified` → `sync_phone_verified`.
- **Portable `touch_updated_at` triggers:** users, profiles, listings, verification_requests, orders, reviews, notification_preferences, marketplace_settings.
- **Portable counter/guard triggers:** `trg_listings_count_aiud` (listings), `trg_user_reports_count_aiud` (reports), `trg_guard_phone_verified` (profiles).

### 5.6 RLS policies (authorization ground truth)

RLS enabled on **every** table. Deny-all (service-role only): `listing_embeddings`, `email_failures`, `search_log`. `auth.jwt()` never used; everything is `auth.uid()` + `is_staff()`/`is_admin()`.

| Table | Policies (business rule) |
|---|---|
| users | SELECT owner∨staff; UPDATE owner. No INSERT/DELETE (trigger-created) |
| profiles | SELECT public; INSERT/UPDATE owner (phone_verified trigger-guarded) |
| user_roles | SELECT owner∨staff; ALL admin |
| categories | SELECT active∨staff; ALL admin |
| listings | SELECT active+not-deleted ∨ owner ∨ staff; +110020 order-participant read (reserved listings); INSERT owner; UPDATE owner∨staff; DELETE owner∨admin |
| listing_images | SELECT if parent visible; ALL parent-owner |
| price_suggestions | SELECT requester∨listing-owner∨staff; no writes (service-role) |
| conversations | SELECT/UPDATE participant∨staff(read); INSERT buyer, buyer≠seller |
| messages | SELECT participant∨staff; INSERT sender=self ∧ participant ∧ conversation not blocked |
| saved_searches / favorites | ALL owner (strictly private) |
| verification_requests | SELECT owner∨staff; INSERT owner; UPDATE staff |
| reports | INSERT reporter=self; SELECT own only (moderation via service-role) |
| admin_actions | SELECT staff; INSERT staff self; append-only |
| orders | SELECT/UPDATE participant; INSERT buyer, buyer≠seller |
| offers | SELECT/INSERT(sender=self)/UPDATE via parent-order participant |
| reviews | SELECT public; INSERT reviewer=self ∧ order completed ∧ role/reviewee cross-check; UPDATE reviewer |
| notifications | SELECT/UPDATE owner; INSERT service-role only |
| notification_preferences | SELECT/INSERT/UPDATE owner |
| admin_audit_log / ai_moderation_log | SELECT admin; writes service-role |
| marketplace_settings | SELECT public; writes service-role |
| listing_views | ALL owner |
| feedback | INSERT self-or-anonymous; SELECT admin |

### 5.7 Storage buckets & policies

| Bucket | Public | Limit | MIME | Object policies |
|---|---|---|---|---|
| `avatars` (110011) | yes | 2 MB | png/jpeg/webp/gif | public read; insert/update/delete require first path segment `= auth.uid()` (`{user_id}/file`) |
| `listing-images` (110013) | yes | 5 MB | png/jpeg/webp/gif | same pattern (`{user_id}/{group}/file`) |

### 5.8 Realtime

Publication `supabase_realtime` (110024): **messages, offers, orders, notifications, reviews**. Consumed by only 2 components (§3). `reviews` is published but has no subscriber.

### 5.9 Notable indexes

FTS GIN on `listings.search_vector` (bilingual, 'simple'); trigram GIN `profiles.display_name`; JSONB GIN `listings.attributes`; GIST `listings.location`; ivfflat `listing_embeddings.embedding`; ~15 partial indexes (active listings, unread messages/notifications, urgent, featured, eid-hash unique); expression index `lower(query)` on search_log.

### 5.10 Seed / reference data

Categories tree seeded **in migration 110010** (bilingual, idempotent); `marketplace_settings` singleton + admin role seed in 110026; `seed.sql` is comments only.

---

## 6. Auth-schema coupling checklist (what breaks when Supabase Auth goes away)

1. FK `public.users.id → auth.users(id) ON DELETE CASCADE` — root identity link.
2. Three triggers on `auth.users` (signup bootstrap, email-confirmed sync, phone-confirmed sync).
3. Functions reading `auth.users` columns / `auth.users%rowtype`: `handle_new_user`, `ensure_self_profile`, `sync_email_verified`, `sync_phone_verified`.
4. `auth.uid()` in every RLS policy, every storage policy, and all helper functions.
5. Service-role key as the RLS bypass mechanism (13 files).
6. GUC handshake `app.trust_write` between `sync_phone_verified` (auth trigger) and `guard_phone_verified`.
7. Phone verification flow = Supabase Auth SMS OTP (`auth.updateUser({phone})`).
8. Password hashes live in `auth.users.encrypted_password` (bcrypt); Google identities in `auth.identities`.

---

## 7. Environment variables

| Var | Used in | Supabase-coupled |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all client factories, lib/storage.ts, sitemap, verify script | **yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | server/browser/middleware clients, sitemap, verify | **yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | utils/supabase/admin.ts | **yes** |
| `ADMIN_EMAILS` | lib/admin/gate.ts | no (kept) |
| `GEMINI_API_KEY`, `AI_PROVIDER`, `ANTHROPIC_API_KEY` | lib/ai/* | no |
| `RESEND_API_KEY`, `EMAIL_FROM` | lib/email/send.ts | no |
| `NEXT_PUBLIC_SITE_URL` | lib/site.ts, orders/reviews email links, reset redirect | no |

---

## 8. Deploy / config coupling

- [next.config.ts](next.config.ts): CSP `connect-src https://*.supabase.co wss://*.supabase.co`; `images.remotePatterns` for `**.supabase.co/storage/v1/object/public/**` and `lh3.googleusercontent.com`; `experimental.authInterrupts` (admin `forbidden()`); `serverActions.bodySizeLimit: '10mb'`.
- `.github/workflows/ci.yml`: typecheck only; Vercel is the build gate; would need Supabase env secrets for a CI build.
- `package.json`: 5 `db:*` Supabase-CLI scripts + `verify`.
- `supabase/config.toml`: local dev stack (Postgres 17, auth email confirmations **off** locally, SMS/Twilio present but disabled, no Google block — Google configured in hosted dashboard only).
- [scripts/audit_rls.sql](scripts/audit_rls.sql): RLS/bucket audit queries (references `storage.buckets`).

---

## 9. Quirks worth knowing before migrating

- `profiles.username` is UNIQUE but **nullable** in DDL despite comments claiming NOT NULL.
- `orders.status`, `offers.status`, `reports.reason/status` are free text with documented-but-unenforced value sets (opportunity: real enums/CHECKs in the new schema).
- `report_reason` / `report_status` enums are orphaned.
- Verification flags are duplicated across `users` (`has_*_verified`) and `profiles` (`*_verified`), kept in sync by auth triggers.
- `avatars` stores the **full public URL** in `profiles.avatar_url`; `listing_images` stores **storage keys** — the data migration must rewrite avatar URLs but not image keys.
- `handle_new_user` swallows all exceptions (110031 fix after an OAuth signup outage) — the app-level replacement must be transactional instead.
- `listing_embeddings` + pgvector and `ensure_self_profile` RPC exist in the schema but have **no app-code consumers** today.
