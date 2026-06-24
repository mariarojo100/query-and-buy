# Query & Buy — System Architecture

> **FINAL MVP DECISION:**
> Query & Buy Phase 1 uses a Supabase-first architecture.
> No NestJS backend.
> No OpenSearch cluster.
> Backend services are handled through Supabase (Postgres, Auth, Storage, Realtime) and Next.js server actions/APIs where required.
>
> _Sections below reflect this decision. Superseded NestJS/OpenSearch plans are summarized in §0.5 "Rejected Alternatives (Phase 1)." This doc was originally framed at 100k users; the approved MVP targets the first 10,000._

> Author: Acting CTO design doc. Scope: Phase 1.
> Decisions are opinionated on purpose. This is a design artifact — no application code.

---

## 0. Guiding Decisions (read this first)

| Concern | Decision | Why |
|---|---|---|
| Topology | **Supabase backend + Next.js app + one Node worker** | Solo founder. One managed platform replaces a hand-built API tier; the worker handles async AI only. |
| Language | **TypeScript end-to-end** (Next.js web + Node worker) | One language, shared types between web and worker. |
| Backend services | **Supabase** — Postgres, Auth, Storage, Realtime, Edge Functions | Auth, DB, storage, realtime, and RLS out of the box. No separate API server to build or operate. |
| Primary DB | **Supabase Postgres** (+ PostGIS for geo, + pgvector for similarity) | One database does relational, geo, and vector search at MVP scale. |
| Authorization | **Row Level Security (RLS)** | Clients talk to the DB directly via PostgREST; RLS is the auth layer. |
| Queue / async | **Postgres-based** (`pgmq` + `pg_cron`) driving the Node worker | AI generation, embeddings, notifications run async without standalone Redis/BullMQ. |
| Search | **Postgres FTS + pgvector** | Full-text + faceted + similarity in-database. OpenSearch deferred post-MVP. |
| Object storage | **Supabase Storage + built-in CDN** | Image-heavy product served via CDN; no separate S3/CloudFront to wire. |
| Realtime | **Supabase Realtime** | In-app chat + live alerts without a bespoke WebSocket gateway. |
| AI | **Claude** (Sonnet 4.6 default, Haiku 4.5 for cheap classification, Opus 4.8 for hard reasoning) | Vision for photo→listing, NL for conversational search, structured output for attributes. |
| **Data residency** | **Host DB + Storage + logs in a UAE region** | UAE PDPL (Federal Decree-Law No. 45/2021). Emirates ID data must not leave jurisdiction casually. Hard constraint. |
| Identity | **Phone-first auth (OTP)** + **UAE PASS** for Emirates ID verification | UAE users are phone-native; UAE PASS is the clean path to verified KYC. |

---

## 0.5 Rejected Alternatives (Phase 1)

Two heavier options were considered and **rejected for the MVP**. They were not wrong — they were right for a funded team at 100k+ scale, and wrong for a solo founder shipping to the first 10,000 users.

**NestJS modular-monolith API — rejected.**
- A hand-built API tier duplicates what Supabase already provides (auth, RLS-secured data access, storage, realtime). For a solo founder it is weeks of undifferentiated plumbing before the first feature ships.
- Adds a service to deploy, scale, secure, and monitor. Supabase + Next.js route handlers / Edge Functions cover MVP API needs with far less surface area.
- Retained as a **future option**: if custom backend logic outgrows Edge Functions + worker, a dedicated service can be introduced behind the same domain boundaries — without a product rewrite.

**OpenSearch cluster — rejected.**
- Solves a scale problem the MVP does not have. Postgres FTS + `pgvector` + PostGIS comfortably handle full-text, similarity, and geo into the hundreds of thousands of rows.
- It is the most expensive and most operationally demanding component in the original design — a managed cluster to fund and babysit for zero MVP benefit.
- Retained as a **future option**: mirror the `listings` table into OpenSearch when catalog volume and query complexity justify it. The search interface is abstracted so this is an additive change.

Also dropped for Phase 1 for the same reasons: **standalone Redis + BullMQ** (replaced by a Postgres-based queue) and **S3 + CloudFront** (replaced by Supabase Storage + CDN).

---

## 1. Complete Database Schema

PostgreSQL. Conventions:
- All PKs are `uuid` (v7, time-sortable) unless noted.
- All tables have `created_at`, `updated_at timestamptz`. Soft delete via `deleted_at timestamptz null` on user-generated content.
- Money stored as `integer` **fils** (1 AED = 100 fils) + `currency char(3) default 'AED'`. Never floats.
- Bilingual text fields stored as `_en` / `_ar` pairs (or `jsonb` `{en, ar}` where many).
- PII columns (Emirates ID, doc images) are **encrypted at rest at the field level** — marked 🔒.

### 1.1 Identity & Trust

```
users
  id              uuid pk
  phone_e164      text unique not null        -- +9715XXXXXXXX
  email           citext unique null
  password_hash   text null                   -- argon2id; null = OTP-only account
  display_name    text not null
  avatar_url      text null
  locale          text default 'en'           -- 'en' | 'ar'
  status          text not null default 'active'  -- active|suspended|banned|deleted
  trust_score     smallint default 0          -- derived, cached
  last_active_at  timestamptz
  created_at / updated_at / deleted_at
  indexes: (phone_e164), (email), (status)

verifications                                 -- one row per channel per user
  id              uuid pk
  user_id         uuid fk -> users
  type            text not null               -- mobile|email|emirates_id
  status          text not null               -- pending|verified|failed|expired
  verified_at     timestamptz null
  unique (user_id, type)

emirates_id_kyc                               -- isolated, high-sensitivity
  id              uuid pk
  user_id         uuid fk -> users unique
  eid_number      text 🔒                      -- encrypted; store hash for dedupe
  eid_number_hash text unique                 -- HMAC for "one ID = one account"
  full_name_en    text 🔒
  full_name_ar    text 🔒
  nationality     text 🔒
  dob             date 🔒
  expiry_date     date
  source          text                        -- 'uae_pass' | 'manual_doc'
  doc_front_key   text 🔒 null                 -- Supabase Storage key (private kyc bucket), manual fallback only
  doc_back_key    text 🔒 null
  status          text                        -- pending|verified|rejected
  reviewed_by     uuid fk -> admin_users null
  created_at / updated_at

verified_badges                               -- denormalized for fast listing render
  user_id         uuid pk fk -> users
  has_mobile      bool
  has_email       bool
  has_emirates_id bool
  badge_level     text                        -- none|basic|verified  (verified = EID done)

auth_sessions                                 -- refresh-token rotation
  id              uuid pk
  user_id         uuid fk -> users
  refresh_hash    text not null               -- sha256 of refresh token
  device_id       text
  ip / user_agent text
  expires_at      timestamptz
  revoked_at      timestamptz null
  index (user_id), (refresh_hash)

otp_challenges                                -- handled by Supabase Auth; optional PG audit copy
  id, target (phone/email), purpose (login|verify|reset),
  code_hash, attempts, expires_at, consumed_at

device_push_tokens
  id, user_id fk, platform (ios|android|web), token, created_at, last_seen_at

user_blocks                                   -- buyer/seller blocking
  blocker_id, blocked_id, created_at  (pk composite)
```

### 1.2 Catalog & Listings

```
categories                                    -- hierarchical
  id              uuid pk
  parent_id       uuid fk -> categories null
  slug            text unique
  name_en / name_ar text
  icon / position
  is_active       bool

category_attributes                           -- schema for per-category fields
  id, category_id fk, key (e.g. 'make','mileage','size'),
  label_en/label_ar, data_type (text|number|enum|bool),
  options jsonb null, is_required, is_filterable, position

listings
  id              uuid pk
  seller_id       uuid fk -> users
  category_id     uuid fk -> categories
  title_en        text
  title_ar        text null
  description     text                         -- primary language; AI can fill both
  price_fils      integer not null
  currency        char(3) default 'AED'
  is_negotiable   bool default true
  condition       text                         -- new|like_new|used|for_parts
  status          text not null default 'draft'
                  -- draft|pending_review|active|sold|expired|rejected|deleted
  emirate         text                         -- enum: dubai|abu_dhabi|sharjah|...
  area            text                         -- e.g. 'Marina', 'JLT'
  location        geography(Point,4326) null   -- PostGIS, optional precise pin
  is_urgent       bool default false
  urgent_until    timestamptz null
  ai_generated    bool default false           -- created via photo→listing
  ai_job_id       uuid null fk -> ai_listing_jobs
  view_count      integer default 0
  published_at    timestamptz null
  expires_at      timestamptz                  -- auto-expire (e.g. +30d)
  search_indexed_at timestamptz null
  created_at / updated_at / deleted_at
  indexes:
    (seller_id), (category_id, status), (status, published_at desc),
    (emirate, category_id) where status='active',
    GIST(location),
    partial (is_urgent, urgent_until) where is_urgent

listing_images
  id, listing_id fk, storage_key, cdn_url,
  position smallint, width, height,
  ai_labels jsonb null,                        -- objects/scene from vision
  is_safe bool default true,                   -- moderation result
  created_at

listing_attributes                             -- EAV for category-specific values
  listing_id fk, attribute_key, value_text, value_num, value_bool
  pk (listing_id, attribute_key)
  index (attribute_key, value_text)  -- faceted filtering

listing_embeddings                             -- similar products
  listing_id  uuid pk fk
  embedding   vector(1024)                      -- pgvector; from text+image
  model       text
  updated_at
  index: ivfflat (embedding vector_cosine_ops)

favorites
  user_id, listing_id, created_at  (pk composite)
  index (user_id, created_at desc)
```

### 1.3 AI Subsystem

```
ai_listing_jobs                                -- photo → listing pipeline
  id              uuid pk
  user_id         uuid fk
  status          text          -- queued|processing|needs_review|completed|failed
  input_image_keys text[]                       -- Supabase Storage keys uploaded by seller
  model           text                          -- 'claude-sonnet-4-6'
  draft           jsonb null                    -- {title, desc, category, attributes, price_range}
  confidence      jsonb null                    -- per-field confidence
  error           text null
  tokens_in/out   integer
  cost_fils       integer                       -- track unit economics
  created_at / completed_at

price_suggestions
  id, listing_id fk (or ai_job_id),
  suggested_min_fils, suggested_max_fils, suggested_point_fils,
  basis            text,                         -- 'comparables'|'model'
  comparables      jsonb,                        -- listing ids + prices used
  model, created_at

ai_usage_log                                   -- per-call audit & cost control
  id, user_id, feature (photo_listing|price|conv_search|moderation),
  model, tokens_in, tokens_out, cost_fils, latency_ms, created_at
  index (user_id, created_at), (feature, created_at)
```

**AI provider (Phase 1):** **Anthropic Claude** — `claude-haiku-4-5` (cheap classification / search parse), `claude-sonnet-4-6` (vision photo→listing, default), `claude-opus-4-8` (hard reasoning). This is the approved Phase 1 provider (see [CHANGELOG](CHANGELOG.md)).

> **Future Flexibility:**
> The AI layer should be provider-agnostic.
> Future versions may support OpenAI or other providers through an abstraction layer.

All AI calls go through `packages/llm` (client, prompts, schemas, cost tracking), so the provider is swappable without touching product code; `ai_usage_log.model` records the exact model per call.

### 1.4 Search & Discovery

```
saved_searches
  id, user_id fk,
  query_text      text null,                    -- raw NL query
  parsed_filters  jsonb,                         -- normalized {category, price, emirate, attrs}
  notify          bool default true,
  notify_channel  text default 'push',          -- push|email
  last_run_at     timestamptz,
  last_match_at   timestamptz,
  index (user_id), (notify) where notify

search_events                                  -- for relevance tuning & "trending"
  id, user_id null, query_text, parsed_filters jsonb,
  result_count, clicked_listing_id null, created_at
  (consider monthly partitioning)
```

### 1.5 Messaging

```
conversations
  id              uuid pk
  listing_id      uuid fk -> listings
  buyer_id        uuid fk -> users
  seller_id       uuid fk -> users
  last_message_at timestamptz
  buyer_unread    smallint default 0
  seller_unread   smallint default 0
  status          text default 'open'           -- open|archived|blocked
  unique (listing_id, buyer_id)                  -- one thread per buyer per listing
  index (seller_id, last_message_at desc), (buyer_id, last_message_at desc)

messages                                       -- high volume → partition by month
  id              uuid pk
  conversation_id uuid fk
  sender_id       uuid fk
  body            text null
  attachments     jsonb null                     -- [{key, type}]
  flagged         bool default false             -- scam/abuse detector
  read_at         timestamptz null
  created_at
  index (conversation_id, created_at)
  PARTITION BY RANGE (created_at)
```

### 1.6 Trust, Safety & Admin

```
reports
  id, reporter_id fk, target_type (listing|user|message),
  target_id, reason (scam|prohibited|spam|offensive|wrong_category|other),
  details text, status (open|reviewing|actioned|dismissed),
  created_at, resolved_by, resolved_at
  index (status, created_at), (target_type, target_id)

moderation_queue                               -- listings needing human/AI review
  id, listing_id fk, source (ai|report|new_seller),
  ai_verdict jsonb,                              -- {allow|reject|review, reasons}
  priority smallint, status, assigned_to,
  created_at

moderation_actions                             -- audit of what mods did
  id, admin_id fk, target_type, target_id, action (approve|reject|suspend|ban|remove),
  reason, metadata jsonb, created_at

admin_users
  id, email unique, password_hash, name, status,
  totp_secret 🔒,                                -- 2FA mandatory for staff
  created_at

roles / permissions / role_permissions / admin_user_roles   -- RBAC (see §5.2)

audit_logs                                     -- every privileged/PII action
  id, actor_type (user|admin|system), actor_id,
  action, entity_type, entity_id, ip, metadata jsonb, created_at
  PARTITION BY RANGE (created_at)               -- append-only, retained per policy
```

### 1.7 Monetization (light in Phase 1)

```
listing_promotions                             -- "Urgent", "Featured", bump
  id, listing_id fk, type (urgent|featured|bump),
  starts_at, ends_at, price_fils, payment_id fk null, status

payments                                       -- via local gateway (PayTabs/Telr/Network Int'l)
  id, user_id fk, provider, provider_ref,
  amount_fils, currency, purpose (promotion|subscription),
  status (pending|paid|failed|refunded), raw jsonb, created_at
```

**Scaling notes baked in:** partition `messages`, `audit_logs`, `search_events`, `ai_usage_log` by month; covering/partial indexes on the hot `status='active'` listing paths; Postgres FTS + pgvector serve browse/search (OpenSearch deferred post-MVP); `verified_badges` and `trust_score` are denormalized to avoid joins on every listing render.

---

## 2. User Flows

### 2.1 Seller — AI Photo→Listing (the 60-second promise)
1. Seller taps **Sell** → uploads 1–8 photos (direct to Supabase Storage via signed upload URLs; never through the app server).
2. Client creates `ai_listing_jobs` (status `queued`); worker picks it up.
3. Worker: image safety check → Claude vision call → returns `draft` (title EN/AR, description, category, attributes, condition) + `price_suggestion` from comparables in Postgres.
4. Seller sees a **pre-filled editable form** in ~5–10s. Confidence-low fields are highlighted.
5. Seller confirms/edits → submits. Listing → `pending_review` (new sellers) or `active` (trusted sellers, auto-moderation pass).
6. Embedding generated async → enables "similar products".

### 2.2 Seller — Urgent Sale Mode
- On create/edit, toggle **Urgent** → sets `is_urgent`, `urgent_until` (e.g. 72h), may require `listing_promotion` payment.
- Urgent listings: badge, boosted ranking in search, eligible for "urgent near you" alerts to matching saved searches.

### 2.3 Trust — Verification ladder
- **Mobile** (mandatory): OTP at signup → `verifications.mobile = verified`.
- **Email** (optional): verify link.
- **Emirates ID** (for Verified badge): redirect to **UAE PASS** OAuth → receive verified identity claims → write `emirates_id_kyc` (status `verified`) → `verified_badges.badge_level = verified`. Manual document upload is the fallback path (goes to admin review queue).

### 2.4 Buyer — Conversational Search
1. Buyer types natural language: *"cheap automatic Corolla in Sharjah under 30k"*.
2. API → Claude (Haiku/Sonnet) parses into `parsed_filters` {category: cars, make: Toyota, model: Corolla, transmission: automatic, emirate: sharjah, price_max: 30000 AED}.
3. Query Postgres (FTS + filters + PostGIS) with relevance ranking; return results + the interpreted filters (editable chips so the user can correct the AI).
4. Log to `search_events` for tuning.

### 2.5 Buyer — Saved Searches & Alerts
- Buyer saves the parsed query → `saved_searches`. New matching listings (incl. urgent) trigger push/email via the notification worker (cron + on-publish fan-out).

### 2.6 Buyer — Similar Products
- On a listing page, query `listing_embeddings` (pgvector cosine) for nearest neighbors in same category/emirate.

### 2.7 Communication — Messaging
- Buyer messages seller from a listing → `conversations` (unique per buyer+listing) → WebSocket delivery + push if offline. Scam-pattern detector flags messages (e.g. off-platform payment, WhatsApp-first scams).

### 2.8 Admin — Moderation
- New/reported listings land in `moderation_queue` (AI pre-verdict). Mods approve/reject/suspend; all actions audited. Analytics dashboard reads from a read-replica / warehouse.

---

## 3. API Architecture

### 3.1 Shape
- **Supabase auto-API (PostgREST)** for standard CRUD, secured by RLS — the Supabase client is the primary data path.
- **Next.js server actions / route handlers** and **Supabase Edge Functions** for custom server logic (auth callbacks, AI job creation, webhooks).
- **Supabase Realtime** for chat and live alerts.
- **Async by default** for anything slow (AI, image processing, embeddings, notifications) via the **Postgres-based queue + Node worker**; clients poll job status or get a Realtime event.
- **Idempotency-Key** on mutating operations (listing create, payment, AI job).
- **Cursor/keyset pagination** everywhere (no OFFSET at scale).

### 3.2 Domains (bounded contexts — Next.js route groups + worker processors, not a separate service)
`auth` · `users` · `verification` · `listings` · `catalog` · `ai` · `search` · `messaging` · `notifications` · `moderation` · `payments` · `admin` · `analytics`

### 3.3 Representative endpoints
```
AUTH
  POST   /auth/otp/request           {phone}            -> challenge id
  POST   /auth/otp/verify            {phone, code}      -> access+refresh
  POST   /auth/token/refresh
  POST   /auth/logout
  GET    /auth/uaepass/start  ·  GET /auth/uaepass/callback   (Emirates ID)

LISTINGS
  POST   /listings                   (Idempotency-Key)  create draft
  GET    /listings/:id
  PATCH  /listings/:id
  POST   /listings/:id/publish
  POST   /listings/:id/urgent        {duration}
  DELETE /listings/:id
  GET    /listings/:id/similar
  GET    /users/me/listings

MEDIA
  POST   /media/presign              -> {url, key}     (direct-to-Supabase-Storage upload)

AI
  POST   /ai/listing-jobs            {image_keys}      -> job id   (async)
  GET    /ai/listing-jobs/:id        -> status + draft
  POST   /ai/price-suggestion        {category, attrs} -> range

SEARCH
  POST   /search                     {query|filters, cursor} -> results + parsed_filters
  POST   /saved-searches  ·  GET /saved-searches  ·  DELETE /saved-searches/:id

MESSAGING
  GET    /conversations  ·  GET /conversations/:id/messages
  POST   /conversations/:id/messages
  WS     /realtime  (message.new, conversation.read, alert.match)

TRUST
  POST   /verification/email/request · /verification/email/confirm
  POST   /reports                    {target, reason}

ADMIN  (separate auth, RBAC, 2FA)
  GET    /admin/moderation/queue · POST /admin/moderation/:id/decision
  GET    /admin/users · POST /admin/users/:id/suspend
  GET    /admin/analytics/*
```

### 3.4 Cross-cutting middleware
Auth (Supabase JWT) → rate limiter → request validation (schema) → locale resolver → handler → structured logging → error normalizer. RLS enforces row access; route / Edge-Function guards enforce staff RBAC. Per-user **and** per-IP rate limits, stricter on AI and OTP endpoints.

### 3.5 External integrations
UAE PASS (OIDC), SMS provider (UAE-licensed, e.g. Unifonic) for OTP, payment gateway (PayTabs/Telr/Network International), push (FCM/APNs), Claude API, email (SES).

---

## 4. Folder Structure

Monorepo (pnpm workspaces / Turborepo). One repo, multiple deployables.

```
query-and-buy/
├─ apps/
│  ├─ web/                      # Next.js 15 (App Router) — buyer, seller, AND admin routes
│  │  └─ src/
│  │     ├─ app/                # route groups: (auth) (marketplace) (sell) (account) (messages) /admin
│  │     ├─ components/         # UI built on Tailwind + shadcn/ui
│  │     ├─ lib/                # supabase clients (server/client), auth, data access
│  │     └─ server/             # server actions / route handlers (custom logic, webhooks)
│  └─ worker/                   # Node + TS — async processors
│     └─ src/processors/        # ai-listing, embeddings, price, moderation,
│                               #   notifications, saved-search-match
│
├─ packages/
│  ├─ db/                       # Supabase migrations, seeds, generated types
│  ├─ contracts/                # Zod DTOs shared by web + worker
│  ├─ llm/                      # AI client, prompts, schemas, cost tracking
│  ├─ ui/                       # shared shadcn/ui components, design tokens
│  ├─ notifications/            # push + email
│  └─ config/                   # eslint / tsconfig / prettier presets
│
├─ supabase/                    # config.toml, migrations, edge functions
├─ docs/                        # this file, ADRs, runbooks, threat model
└─ docker-compose.yml           # local dev: supabase stack
```

Admin lives inside `apps/web` under `/admin` (RBAC-gated), not a separate app. A React Native client (`apps/mobile`) is a post-MVP addition that consumes `packages/contracts`.

---

## 5. Security Architecture

### 5.1 Authentication
- **Phone-first OTP** (primary): 6-digit, short TTL, max 5 attempts, exponential backoff, per-phone + per-IP throttling — managed by Supabase Auth. SMS via UAE-licensed provider.
- **Tokens**: short-lived **JWT access** (~15 min) + **rotating refresh** (httpOnly cookie on web; secure storage on mobile). Refresh reuse detection → revoke session family (`auth_sessions`).
- **Passwords** (optional): Argon2id. **Emirates ID / KYC via UAE PASS** OIDC — we receive verified claims, minimizing the raw documents we hold.
- **Staff**: separate admin auth domain, **mandatory TOTP 2FA**, IP allow-listing for high-privilege actions.

### 5.2 Authorization
- **RBAC** for staff (roles → permissions; e.g. `moderator`, `support`, `finance`, `superadmin`).
- **Resource ownership** checks for users (you can only edit your own listings/conversations) enforced in a central guard, never trusted from the client.
- Default-deny: every endpoint declares its required scope.

### 5.3 Data protection & UAE compliance (the part that gets a startup fined)
- **Data residency**: Postgres, backups, object storage, and logs for UAE-PII live **in a UAE region**. PDPL (Federal Decree-Law No. 45/2021) governs processing of personal data — design for consent, purpose limitation, data-subject rights (access/erasure), and breach notification.
- **Field-level encryption** (🔒) for Emirates ID number, name, DOB, nationality, and any ID document images — keys in **KMS**, separate from the data. Store an **HMAC of the EID number** for "one identity = one account" without keeping it in plaintext.
- **Encryption in transit**: TLS 1.3 everywhere; HSTS.
- **Minimize**: prefer UAE PASS verified claims over storing raw documents; auto-purge manual KYC images after verification per retention policy.
- **PII access is audited** (`audit_logs`, append-only, partitioned) and gated behind RBAC + reason capture.

### 5.4 Application security
- Validate all input against schemas (`packages/contracts`); reject unknown fields.
- Parameterized queries only (ORM) — no string-built SQL.
- Output encoding + CSP on web; sanitize user HTML in descriptions/messages.
- **Rate limiting & quotas**: aggressive on OTP, AI endpoints (cost abuse), search, and messaging. Per-user AI spend cap (`ai_usage_log`) to protect unit economics.
- **Idempotency keys** to prevent duplicate listings/payments.
- Secrets in a managed secret store, never in env files in the repo. Short-lived DB creds where possible.

### 5.5 Trust & Safety (marketplace-specific abuse)
- **Listing moderation pipeline**: every new listing + image runs through AI moderation (prohibited goods, scams, NSFW, miscategorization) → `allow` auto-publishes for trusted sellers; `review`/`reject` routes to `moderation_queue`.
- **Image safety** before any image becomes public (`listing_images.is_safe`).
- **Scam detection in chat**: flag off-platform-payment / advance-fee / phishing patterns; warn buyers; feed `reports`.
- **Account integrity**: one Emirates ID → one verified account (HMAC dedupe); velocity limits on new accounts (listings/day, messages/day); device + IP fingerprinting for ban evasion.
- **Reporting**: in-product report flow on every listing/user/message → triage queue.

### 5.6 Infrastructure & operations
- **Network**: managed Supabase Postgres (not publicly exposed), **WAF + CDN** at the edge, DDoS protection.
- **Least privilege** IAM; per-service roles; no shared admin keys.
- **Backups**: automated encrypted Postgres backups + PITR, periodic restore drills. Object storage versioned.
- **Observability**: structured logs (PII-scrubbed), metrics, tracing, alerting; security monitoring on auth anomalies and PII access.
- **SDLC**: dependency scanning, secret scanning in CI, SAST, mandatory code review, staging that mirrors prod, IaC reviewed like code.
- **Incident response**: documented runbook + breach-notification process aligned to PDPL timelines.

---

## Appendix — Phase-1 build order (recommended)
1. Identity + mobile OTP + sessions (foundation).
2. Catalog + listing CRUD + media upload + Postgres FTS indexing.
3. AI photo→listing + price suggestion (the differentiator).
4. Conversational search + saved searches.
5. Messaging + notifications.
6. Emirates ID (UAE PASS) + verified badge.
7. Moderation + admin + analytics.
8. Urgent mode + promotions/payments.
```
```
