# Query & Buy — Project Status (Source of Truth)

> AI-powered UAE marketplace. Differentiator: **photo → listing in under 60 seconds**.
> Competitors: Dubizzle, Facebook Marketplace, OpenSooq. Scale target: **100,000+ UAE users**.
> Status: **design complete, pre-build. Architecture finalized: Supabase-first (see [CHANGELOG](CHANGELOG.md) 2026-06-23).** Docs: [ARCHITECTURE](ARCHITECTURE.md) · [database-design](database-design.md) · [ui-spec](ui-spec.md) · [roadmap](roadmap.md) + [Part 2](roadmap-part-2.md).

---

## 1. Architecture Decisions

- **Supabase-first architecture (final, locked decision).** Backend is **Supabase** — Postgres, Auth, Storage, Realtime, Edge Functions — with Next.js server actions / route handlers for custom logic. **No NestJS backend. No OpenSearch cluster.** **RLS is the authorization layer** (clients talk to the DB directly via PostgREST). See [ARCHITECTURE](ARCHITECTURE.md) §0.5 "Rejected Alternatives" and [CHANGELOG](CHANGELOG.md).
- **Minimal surface for a solo founder** — one managed backend, one Next.js app (incl. admin), one Node worker for async AI. Targets the **first 10,000 users**; heavier infra (OpenSearch, Redis/BullMQ, a dedicated API service) is deferred post-MVP and addable without a product rewrite.
- **Async AI via a small Node worker** — photo→listing, embeddings, price suggestions, notifications, saved-search matching run off the request path. **Anthropic Claude is the approved Phase 1 AI provider** (final), accessed through a provider-agnostic `packages/llm` layer so other providers can be added later.
- **Data residency is a hard constraint** — all PII + DB + Storage + logs in a UAE/near region (PDPL, Federal Decree-Law 45/2021). Shapes cloud region before any code.
- **Phone-first auth + UAE PASS** for Emirates ID KYC — UAE users are phone-native; UAE PASS yields verified claims without storing raw ID documents.
- **Postgres FTS + pgvector at launch**; OpenSearch deferred until catalog volume demands it.

## 2. Database Design

- **Identity split:** `auth.users` (Supabase-managed) → `public.users` (private account state, owner/staff-read) → `public.profiles` (public seller card, world-readable). Deliberate, because the read boundary must be a table boundary under direct PostgREST access.
- **Core tables:** users, profiles, user_roles, categories, listings, listing_images, listing_embeddings, price_suggestions, conversations, messages, saved_searches, favorites, verification_requests, reports, admin_actions (+ AI job/usage tables).
- **RLS on every table**, written against `auth.uid()` with `SECURITY DEFINER` role helpers (`has_role`/`is_staff`/`is_admin`) to avoid recursion. Backend workers use `service_role` (bypasses RLS) — key never reaches clients.
- **Conventions:** UUID PKs, money as `bigint` **fils** (never floats), bilingual `_en`/`_ar` fields, soft deletes, `timestamptz`.
- **Scale baked in:** partial indexes on `status='active'` hot paths, GIN (FTS + JSONB attributes), GiST (geo), ivfflat (similarity); month-partition `messages`/audit/search-events; denormalized counters (`listings_count`, ratings, unread, trust_score).
- **Integrity & compliance:** one Emirates ID = one account (HMAC unique index); `admin_actions` is append-only/immutable (insert-only RLS); cascade deletes support PDPL erasure.

## 3. UI Decisions

- **Design lineage:** Airbnb (photo-forward warmth, trust everywhere) on the consumer side, Stripe (calm dense data) on admin, Apple (typographic restraint, motion that explains) holding the bar.
- **Bilingual/RTL is non-negotiable** — full Arabic mirroring, AED tabular figures, numbers stay LTR inside RTL text, persisted locale toggle.
- **Trust as a system** — reusable Verified badge + seller trust row on cards, detail, profile, chat.
- **8 pages specced** (layout · components · actions · mobile · empty · error each): Homepage, Search Results, Listing Detail, Create Listing, User Profile, Messages, Saved Searches, Admin Dashboard.
- **Signature moments:** Create Listing's AI "skeleton-form-filling-in" reveal; search shows the AI's interpreted filters as **editable chips**; empty states designed as retention moments (zero results → "save this search & get notified").
- **Mobile:** bottom tab bar with center Sell FAB; admin is desktop-first, degrading to tablet triage.
- **Cross-cutting:** skeletons over spinners, optimistic UI, offline queueing, auth interruptions return user to exact intent, WCAG 2.1 AA.

## 4. Technology Stack

| Layer | Choice |
|---|---|
| Backend | Supabase (Postgres 15+, Auth, Storage, Realtime, Edge Functions) |
| Web | **Next.js 15** (App Router, TypeScript) + **Tailwind CSS** + **shadcn/ui** — responsive web first; admin under `/admin` |
| Worker | Node + TypeScript (async AI jobs; Postgres-based queue, no Redis) |
| AI | **Anthropic Claude API — approved Phase 1 provider (final).** `claude-sonnet-4-6` (vision/default), `claude-haiku-4-5` (cheap classification), `claude-opus-4-8` (hard reasoning). Accessed via a provider-agnostic `packages/llm` abstraction. |
| Search | Postgres FTS + pgvector (OpenSearch later) |
| Geo | PostGIS |
| Auth | Supabase phone OTP (UAE SMS gateway, e.g. Unifonic) + UAE PASS OIDC |
| Storage/CDN | Supabase Storage + CDN |
| Monorepo | pnpm + Turborepo (`apps/web` incl. `/admin`, `apps/worker`, `packages/{db,contracts,ui,llm,notifications,config}`) |
| Hosting/Ops | **Vercel** (web, UAE-near) + small host for worker, Sentry, GitHub Actions CI/CD, k6 + Playwright |
| Payments | PayTabs/Telr/Network International (post-launch, for promotions) |

**Build plan:** 12 sprints (1–3 days each). 1–5: setup, auth, profiles, listing creation, AI photo-to-listing. 6–12: search, listing details, messaging, verification, admin, deployment, production QA.

## 5. Remaining Unknowns

- **AI quality/latency at scale** — accuracy of photo→listing (category/attribute/price), median latency under load, and unit cost per listing are unvalidated until real testing.
- **UAE PASS integration specifics** — onboarding, sandbox access, claim scopes, and approval timeline are external dependencies not yet started.
- **SMS provider** — final UAE-licensed gateway, OTP deliverability, and per-message cost not finalized.
- **Region/data-residency exactness** — confirm Supabase region that satisfies PDPL and its sub-processor list.
- **Search strategy threshold** — at what catalog size Postgres FTS must give way to OpenSearch.
- **Moderation precision/recall** — AI moderation thresholds and human-review SLA need real-data tuning.
- **Monetization model** — pricing for Urgent/Featured and whether Phase 1 charges at all.
- **Native mobile timing** — responsive web vs. React Native priority post-launch.

## 6. Risks

- **AI is the differentiator and the biggest risk** — if photo→listing is inaccurate, slow, or uneconomical, the core value prop fails. *Mitigation: graceful manual fallback (already designed), per-user quotas, cost logging, model fallback.*
- **Trust & safety / fraud** — marketplaces attract scams; weak moderation erodes trust fast. *Mitigation: AI+human moderation pipeline, chat scam detection, Emirates ID verification, immutable audit log, reporting.*
- **RLS is the only authz layer** — a single misconfigured policy = data exposure. *Mitigation: full (role × table × operation) RLS matrix test + pen test in Sprint 12.*
- **PDPL non-compliance** — data residency, consent, erasure, breach notification carry legal/financial exposure. *Mitigation: in-region hosting, PII minimization, data export/delete flows, retention/purge jobs.*
- **External dependencies** (UAE PASS, SMS gateway, payment gateway) — onboarding delays could block the verification/launch path. *Mitigation: start integrations early; manual KYC fallback exists.*
- **Incumbent competition** (Dubizzle/OpenSooq) — established liquidity and trust. *Mitigation: lean entirely on the 60-second AI listing + conversational search as wedge.*
- **AI cost runaway** — vision calls at scale without caps threaten unit economics. *Mitigation: `ai_usage_log` spend caps + alerts.*

---

*Single source of truth — update this file when any architecture, schema, stack, or scope decision changes.*
