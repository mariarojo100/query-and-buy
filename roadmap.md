# Query & Buy — Build Roadmap (Part 1: Sprints 1–5)

> Foundation phase: from empty repo to a seller creating an AI-generated listing.
> Sprints are sized 1–3 days. Each lists **Objective · Tasks · Files · Testing checklist**.
> Grounded in [ARCHITECTURE.md](ARCHITECTURE.md), [database-design.md](database-design.md), [ui-spec.md](ui-spec.md).

## Stack reconciliation (read once)

The architecture doc explored a NestJS/OpenSearch monolith; the database doc then committed to **Supabase**. This roadmap follows the **Supabase-first path** — the right call for a startup at this scale:

- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). RLS is the authorization layer.
- **Frontend:** Next.js (App Router, TypeScript) — responsive web first; React Native a later phase.
- **AI worker:** a small Node service (`apps/worker`) for async jobs (photo→listing, embeddings, price, notifications) calling the **Claude API** (`claude-sonnet-4-6` default, `claude-haiku-4-5` for cheap classification). Queue via Supabase `pgmq`/`pg_cron` or a lightweight Redis+BullMQ — start with pg-based queue to avoid extra infra.
- **Search at launch:** Postgres FTS + pgvector. OpenSearch deferred until catalog volume needs it.
- **Monorepo:** pnpm + Turborepo.

---

# Sprint 1 — Project Setup

### Objective
Stand up a production-grade monorepo, Supabase environments, CI/CD, and the shared tooling every later sprint depends on. Definition of done: a "hello" Next.js app deploys to a staging URL through CI, connected to a Supabase staging project, with linting/formatting/type-checks enforced on every PR.

### Tasks
- Initialize **pnpm + Turborepo** monorepo; workspaces for `apps/*` and `packages/*`.
- Scaffold `apps/web` (Next.js App Router, TypeScript strict mode).
- Scaffold `apps/worker` (Node + TypeScript) skeleton (no jobs yet).
- Create shared packages: `packages/db` (Supabase migrations + generated types), `packages/contracts` (Zod schemas/DTOs), `packages/ui` (component library shell), `packages/config` (eslint/tsconfig/prettier presets).
- Provision **three Supabase projects**: `local` (Docker via Supabase CLI), `staging`, `production`. Pin Postgres extensions (`pgcrypto`, `postgis`, `vector`, `pg_trgm`).
- Wire **Supabase CLI**: `supabase init`, link projects, migration workflow, `db reset` for local.
- Tooling: ESLint, Prettier, TypeScript strict, Husky pre-commit (lint + typecheck), commitlint (Conventional Commits).
- **CI (GitHub Actions):** install → lint → typecheck → unit test → build; PR-gated. Apply DB migrations to staging on merge to `main`.
- **CD:** deploy `apps/web` to Vercel (or chosen host in a UAE-near region), staging + production environments.
- **Secrets management:** `.env.example`, env-var schema validation at boot, secrets in host/CI vaults (never committed). Document Supabase anon vs service_role key separation.
- Set up **error tracking (Sentry)** and structured logging stubs in web + worker.
- Repo hygiene: `README`, `CONTRIBUTING`, branch protection, CODEOWNERS, `.gitignore`, PR template.

### Files
```
package.json · pnpm-workspace.yaml · turbo.json · .gitignore · .nvmrc
.github/workflows/ci.yml · .github/workflows/deploy.yml · .github/pull_request_template.md
.husky/pre-commit · commitlint.config.js
apps/web/                      (next.config.js, app/layout.tsx, app/page.tsx, tsconfig.json)
apps/worker/                   (src/index.ts, tsconfig.json)
packages/config/               (eslint-preset.js, tsconfig.base.json, prettier.config.js)
packages/db/                   (supabase/config.toml, supabase/migrations/.gitkeep, package.json)
packages/contracts/            (src/index.ts)
packages/ui/                   (src/index.ts)
.env.example · README.md · CONTRIBUTING.md · CODEOWNERS · docs/runbook.md
```

### Testing checklist
- [ ] `pnpm install` clean from zero; `pnpm build` and `pnpm typecheck` pass across all workspaces.
- [ ] `supabase start` brings up local stack; `supabase db reset` succeeds; all four extensions load.
- [ ] CI runs on a throwaway PR: lint, typecheck, test, build all green; failing lint blocks merge.
- [ ] Merge to `main` deploys web to staging; staging URL renders the hello page.
- [ ] Migrations apply to staging automatically on merge.
- [ ] Pre-commit hook rejects a badly-formatted commit; commitlint rejects a non-conventional message.
- [ ] Sentry captures a deliberately-thrown test error from web and worker.
- [ ] No secret is present in the repo; boot fails loudly when a required env var is missing.
- [ ] Branch protection prevents direct push to `main`.

---

# Sprint 2 — Authentication

### Objective
Phone-first OTP authentication (UAE-native) with secure sessions, plus the `auth.users → public.users → public.profiles → user_roles` bootstrap. Definition of done: a new user signs up with a UAE phone number, verifies an OTP, and lands authenticated with account + profile + default role rows created atomically.

### Tasks
- Configure **Supabase Auth phone provider** with a UAE-licensed SMS gateway (e.g. Unifonic) for OTP; set OTP length/expiry, rate limits, and `+971` handling.
- Migration: `public.users`, `public.profiles`, `public.user_roles`, the `app_role`/`user_status` enums, and role helper functions (`has_role`, `is_staff`, `is_admin`), `touch_updated_at` trigger.
- **Bootstrap trigger** on `auth.users` insert → create `users` + `profiles` + `user_roles('user')` in one transaction; set `has_mobile_verified` on first OTP success.
- Enable **RLS** + policies for `users` (self/staff read, self update) and `profiles` (public read, owner write) and `user_roles` (read own, admin write).
- Web: **auth UI** — phone entry, OTP entry (6-digit), resend with cooldown, sign-out. Inline auth **sheet** that can be raised from any gated action and returns the user to their original intent.
- Session handling: Supabase SSR client (cookies, httpOnly), middleware for protected routes, token refresh, `last_active_at` update.
- Client-side rate-limit UX (resend cooldown, attempt cap messaging) on top of server limits.
- Auth context/provider in web; `useUser()` hook; route guards for authenticated vs anon.
- Wire `packages/contracts` schemas for auth payloads.

### Files
```
packages/db/supabase/migrations/0001_identity.sql      (enums, users, profiles, user_roles, helpers, triggers, RLS)
apps/web/app/(auth)/sign-in/page.tsx · app/(auth)/verify/page.tsx
apps/web/components/auth/PhoneForm.tsx · OtpForm.tsx · AuthSheet.tsx
apps/web/lib/supabase/server.ts · client.ts · middleware.ts
apps/web/lib/auth/useUser.ts · AuthProvider.tsx · guards.ts
apps/web/middleware.ts
packages/contracts/src/auth.ts
docs/auth-flow.md
```

### Testing checklist
- [ ] New phone signup → OTP delivered → verify → authenticated session established.
- [ ] Bootstrap trigger creates exactly one `users`, one `profiles`, one `user_roles('user')`; no duplicates on retry.
- [ ] `has_mobile_verified = true` after successful OTP.
- [ ] Wrong OTP rejected; attempt cap enforced; resend respects cooldown; expired OTP rejected.
- [ ] RLS: user A cannot read user B's `public.users` row; both can read public `profiles`.
- [ ] User cannot self-assign a staff role via direct `user_roles` write (policy denies).
- [ ] Session persists across reload; refresh works; sign-out clears session and protected routes redirect.
- [ ] Auth sheet raised from a gated action returns to the exact prior intent after login.
- [ ] Invalid/non-UAE phone formats handled gracefully; rate limits return clear UX.
- [ ] E2E (Playwright) happy-path signup + sign-out passes in CI.

---

# Sprint 3 — Profiles

### Objective
Public seller profile (trust surface) and the owner account hub, plus avatar upload and the verification-ladder scaffold. Definition of done: a user edits their profile, uploads an avatar, views any public profile with trust signals, and sees a verification center reflecting their mobile-verified state.

### Tasks
- **Supabase Storage** bucket `avatars` (public read, owner write via Storage RLS); image type/size constraints; client-side resize before upload.
- Profile **edit form**: display name, bio, avatar, primary emirate, locale preference; optimistic save with rollback on error.
- **Public profile page** (`/u/[id]`): trust header card (avatar, name, verified badge, rating avg/count, member-since, response-time placeholder, emirate), tabs (Listings / Reviews / About). Listings tab wired to render when listings exist (Sprint 4+).
- **Owner account hub** (`/account`): profile edit, **Verification center** (mobile ✓ / email / Emirates ID ladder as a vertical stepper — states only, flows land in a later trust sprint), settings (language, notifications placeholder), and **PDPL data-rights controls** scaffold (Download my data / Delete account entry points).
- Reusable **trust components** in `packages/ui`: VerifiedBadge, RatingDisplay, SellerTrustCard, EmptyState.
- Denormalized counter wiring: `profiles.listings_count`, `rating_avg/count` read paths (counters maintained later via triggers).
- RTL/bilingual correctness on all profile surfaces; locale toggle persists to `users.locale`.
- Report-user affordance on public profile (UI only; backend in trust sprint).

### Files
```
packages/db/supabase/migrations/0002_profiles_storage.sql   (storage bucket policies, profile counters defaults)
apps/web/app/u/[id]/page.tsx                                (public profile)
apps/web/app/account/page.tsx · account/settings/page.tsx · account/verification/page.tsx
apps/web/components/profile/ProfileHeader.tsx · ProfileEditForm.tsx · VerificationLadder.tsx · DataRights.tsx
apps/web/components/profile/AvatarUploader.tsx
packages/ui/src/VerifiedBadge.tsx · RatingDisplay.tsx · SellerTrustCard.tsx · EmptyState.tsx · Tabs.tsx
apps/web/lib/storage/avatar.ts
packages/contracts/src/profile.ts
```

### Testing checklist
- [ ] Owner edits profile; changes persist and render on public page; optimistic update rolls back on simulated failure.
- [ ] Avatar upload: valid image succeeds and displays via CDN; oversized/invalid type rejected with inline error; old avatar retained on failure.
- [ ] Storage RLS: user A cannot overwrite user B's avatar object.
- [ ] Public profile readable by anonymous visitor; private `users` fields never exposed in the response.
- [ ] Verification center shows mobile = verified, email/EID = not started, as a clear ladder.
- [ ] Empty states render: profile with no listings, no reviews.
- [ ] Locale toggle switches EN↔ع, mirrors layout (RTL), and persists across sessions.
- [ ] Data-rights entry points present (Download / Delete) and gated behind confirmation (full flow tested in compliance sprint).
- [ ] Accessibility: keyboard nav, focus rings, alt text on avatar, AA contrast on trust components.

---

# Sprint 4 — Listing Creation (manual)

### Objective
A seller can manually create, edit, save-as-draft, and publish a listing with photos — the complete listing lifecycle **without** AI yet (AI augments this flow in Sprint 5). Definition of done: a verified user creates a multi-photo listing, sees it as a polished detail page and card, and can edit/mark-sold.

### Tasks
- Migration: `categories`, `category_attributes`, `listings`, `listing_images`, the listing enums (`listing_status`, `listing_condition`, `emirate`), `search_vector` generated column, all listing **indexes** (partial `status='active'`, GIN FTS, GIN attributes, GiST geo, seller/category), and listing/image **RLS** policies. Seed an initial category tree (Cars, Electronics, Furniture, Property, …) with attributes.
- **Storage** bucket `listing-images` (owner write, public read for safe images); presign/direct-upload, client resize, EXIF strip, cover-photo + reorder.
- **Create-listing flow** (stepped, per ui-spec §4): Photos → Details (title EN/AR, category picker, dynamic attributes, condition, description) → Price (manual; suggestion band added Sprint 5) → Location (emirate required, area, optional pin) → Urgent toggle (UI; billing later) → Review & Publish.
- **Draft** persistence (save & resume); new-seller listings → `pending_review`, trusted → `active` (moderation pipeline lands later; default `pending_review` for now with an admin override path stub).
- **Listing detail page** (`/listing/[id]`): gallery + lightbox, price block, spec grid from attributes, description, seller trust card, approximate map, owner actions (Edit / Mark sold / Delete).
- **Listing card** component + a basic listings grid (homepage feed wired minimally to verify rendering; full homepage is a later sprint).
- Counter triggers: maintain `profiles.listings_count` on insert/delete/status change.
- Validation via `packages/contracts` (price ≥ 0, required fields, attribute schema per category).

### Files
```
packages/db/supabase/migrations/0003_catalog_listings.sql   (categories, attributes, listings, images, indexes, RLS, counters)
packages/db/supabase/seed/categories.sql
apps/web/app/sell/page.tsx · sell/[draftId]/page.tsx                 (stepped flow)
apps/web/components/sell/PhotoUploader.tsx · CategoryPicker.tsx · AttributeFields.tsx · PriceStep.tsx · LocationStep.tsx · ReviewStep.tsx · Stepper.tsx
apps/web/app/listing/[id]/page.tsx
apps/web/components/listing/Gallery.tsx · Lightbox.tsx · SpecGrid.tsx · OwnerActions.tsx
packages/ui/src/ListingCard.tsx · PriceTag.tsx · Map.tsx
apps/web/lib/storage/listingImages.ts
apps/web/lib/listings/*.ts
packages/contracts/src/listing.ts
```

### Testing checklist
- [ ] Create listing end-to-end: photos upload (reorder + cover), all fields, publish → appears as card + detail page.
- [ ] Draft save & resume works; closing mid-flow does not lose data.
- [ ] Dynamic attributes render per selected category; required validation enforced; price `< 0` rejected.
- [ ] RLS: owner sees own draft/pending; anonymous sees only `active`; non-owner cannot edit/delete (policy denies).
- [ ] Listing images: oversized/invalid rejected per-image with others unaffected; EXIF stripped; only `is_safe` images render publicly.
- [ ] `search_vector` populates; GIN/partial indexes used by `EXPLAIN` on the active-listing query.
- [ ] `profiles.listings_count` increments/decrements correctly across create/delete/mark-sold.
- [ ] Detail page: gallery + lightbox keyboard nav; spec grid matches attributes; owner actions gated to owner.
- [ ] Mark-sold flips status, removes from active feed, disables contact.
- [ ] Bilingual: title_ar/RTL renders; AED prices tabular; empty-state for single-image gallery.
- [ ] E2E create→publish→view passes in CI.

---

# Sprint 5 — AI Photo-to-Listing

### Objective
Deliver the core differentiator: upload photos → AI returns a fully pre-filled, editable draft in seconds. The human stays in control; AI failure degrades gracefully to the manual flow from Sprint 4. Definition of done: a seller uploads photos and, within ~10s, sees title (EN+AR), category, attributes, description, and condition pre-filled with low-confidence fields flagged.

### Tasks
- Migration: `ai_listing_jobs`, `ai_usage_log` tables (status, input keys, model, draft jsonb, confidence jsonb, tokens, cost_fils, error); RLS (owner reads own jobs; worker writes via service_role).
- **Worker job pipeline** (`apps/worker`): consume queued jobs → image **safety check** (sets `listing_images.is_safe`, rejects unsafe) → **Claude vision** call (`claude-sonnet-4-6`) with a strict **structured-output schema** (title_en, title_ar, category_slug, attributes, description, condition, per-field confidence) → write `draft` + confidence → move job to `completed`/`needs_review`.
- **Prompt + schema** in `packages/llm`: vision prompt, JSON schema, category-mapping guardrails (map to the seeded category tree, not free text), bilingual generation, cost/latency capture into `ai_usage_log`.
- **Cost controls:** per-user daily AI quota (read/enforce against `ai_usage_log`), token/cost logging, model fallback (`haiku` for retries/cheap paths).
- **Web integration into Sprint-4 flow:** Photos step now triggers an AI job; show the **skeleton-form-filling-in** animation (per ui-spec §4); populate the editable form from `draft`; highlight low-confidence fields ("Double-check this"); **Regenerate** action; manual-fallback path on failure with photos preserved.
- **Job status delivery:** poll `ai_listing_jobs` or subscribe via Supabase Realtime; loading/timeout states.
- Idempotency: one job per photo set; guard against duplicate enqueues.
- Telemetry: success rate, median latency, fields-edited-by-user rate (quality signal), cost per listing.

### Files
```
packages/db/supabase/migrations/0004_ai_jobs.sql            (ai_listing_jobs, ai_usage_log, RLS)
apps/worker/src/processors/aiListing.ts · imageSafety.ts · queue.ts
apps/worker/src/index.ts                                    (register processor, scheduler)
packages/llm/src/client.ts · prompts/photoToListing.ts · schemas/listingDraft.ts · cost.ts · quota.ts
apps/web/components/sell/AiDraftLoader.tsx                   (skeleton fill-in animation)
apps/web/components/sell/ConfidenceField.tsx · RegenerateButton.tsx
apps/web/lib/ai/listingJob.ts                               (create job, subscribe/poll)
apps/web/app/sell/page.tsx                                   (wire AI trigger into Photos step)
packages/contracts/src/ai.ts
docs/ai-photo-to-listing.md
```

### Testing checklist
- [ ] Upload photos → job enqueued → draft returned and form pre-fills within target latency; Realtime/poll updates the UI.
- [ ] Structured output validates against schema; malformed model output triggers a retry, not a crash.
- [ ] Category always maps to a real seeded category; never free-text/invalid.
- [ ] Low-confidence fields are visibly flagged; user edits override AI; final published values reflect user edits.
- [ ] **AI failure → manual fallback** with photos preserved; "Try again" re-enqueues; no dead end.
- [ ] Image safety: unsafe photo rejected (`is_safe=false`), never published, user told why.
- [ ] Per-user daily quota enforced; exceeding it returns clear UX and is logged.
- [ ] `ai_usage_log` records model, tokens, cost_fils, latency for every call; cost-per-listing dashboard reflects it.
- [ ] RLS: a user cannot read another user's `ai_listing_jobs`; only service_role writes drafts.
- [ ] Idempotency: re-submitting the same photo set does not create duplicate jobs.
- [ ] Bilingual output: title_ar present and sensible; RTL renders correctly in the form.
- [ ] End-to-end: photos → AI draft → edit → publish produces a live listing.

---

> **Next:** Part 2 (Sprints 6–10) — Homepage & feed, Listing Detail polish + Similar Products, Search (FTS + filters + map), Conversational Search, Saved Searches & Alerts.
```
