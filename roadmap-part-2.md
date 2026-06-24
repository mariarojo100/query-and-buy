# Query & Buy — Build Roadmap (Part 2: Sprints 6–12)

> Discovery → trust → operations → launch. Continues [roadmap.md](roadmap.md) (Sprints 1–5).
> Sprints sized 1–3 days. Each lists **Objective · Tasks · Files · Testing checklist**.
> Grounded in [ARCHITECTURE.md](ARCHITECTURE.md), [database-design.md](database-design.md), [ui-spec.md](ui-spec.md).
> Stack: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) · Next.js web · Node AI worker · Claude API · Postgres FTS + pgvector.

---

# Sprint 6 — Search

### Objective
Buyers find anything fast: full-text + faceted + geo search over active listings, with AI **conversational search** that parses natural language into editable filter chips, plus **Saved Searches** with alerts. Definition of done: a buyer types *"automatic Corolla under 30k in Sharjah"*, sees correctly-parsed filter chips and ranked results on a map+grid, and can save the search to get notified of new matches.

### Tasks
- **Search RPC** (Postgres `SECURITY DEFINER` function or PostgREST RPC): combines `search_vector @@ query`, `attributes @>` facets, `category_id`, `emirate`, `price` range, `condition`, and PostGIS distance; ranks with urgent-boost; **keyset/cursor pagination** (no OFFSET); returns result count. Respects RLS (`status='active'` only).
- **Conversational parse:** worker/Edge Function calls Claude (`claude-haiku-4-5` first, escalate to `sonnet`) to turn NL → structured `parsed_filters` mapped to the seeded category tree + attribute keys; return interpreted filters to the UI as **editable chips**.
- **Search Results page** (ui-spec §2): search header with persistent query, AI filter chips (removable/editable), filter bar + "More filters" sheet (category-specific attributes), sort (Relevance/Newest/Price/Urgent), results grid, **sticky map** with card↔pin hover-sync, infinite scroll.
- **Saved Searches:** `saved_searches` writes; "Save this search" CTA; saved-search list page (ui-spec §7) with run/edit/rename/delete, notification channel toggle, new-match preview.
- **Alerts worker:** on each new `active` listing, match against `saved_searches where notify`; enqueue notification; stamp `last_match_at`. (Notification delivery channel = push/email stub here, fully wired in admin/notifications.)
- `search_events` logging for relevance tuning + "trending".
- Performance: verify GIN(FTS)/GIN(attributes)/GiST(geo)/partial(`status='active'`) indexes are used via `EXPLAIN ANALYZE`.

### Files
```
packages/db/supabase/migrations/0005_search.sql            (search RPC, saved_searches RLS already exists, search_events, alert match fn)
apps/web/app/search/page.tsx
apps/web/components/search/SearchHeader.tsx · FilterChips.tsx · FilterSheet.tsx · SortMenu.tsx · ResultsGrid.tsx · ResultsMap.tsx · SaveSearchButton.tsx
apps/web/app/saved-searches/page.tsx
apps/web/components/saved/SavedSearchCard.tsx · NotifyToggle.tsx
apps/worker/src/processors/parseQuery.ts · savedSearchMatch.ts
packages/llm/src/prompts/parseSearch.ts · schemas/parsedFilters.ts
apps/web/lib/search/*.ts · packages/contracts/src/search.ts
```

### Testing checklist
- [ ] NL query parses to correct filter chips; chips are removable/editable and re-run the search.
- [ ] Misparse is correctable by the user (edit chip) and results update accordingly.
- [ ] Facet, price, emirate, condition, category filters combine correctly; sort options work; urgent listings boosted.
- [ ] Geo: "near me" / area filter returns distance-ranked results; map pins sync with cards on hover.
- [ ] Cursor pagination returns stable, non-duplicated pages; infinite scroll works.
- [ ] RLS: only `active` non-deleted listings appear; a buyer never sees drafts/pending.
- [ ] `EXPLAIN ANALYZE` confirms index usage on the hot query; p95 latency within target at seeded scale.
- [ ] Save search persists; saved-search list run/edit/rename/delete works; notify toggle persists.
- [ ] New matching listing triggers an alert match row + `last_match_at` update.
- [ ] Empty state: zero results offers loosen-filters + save-search; over-filtered highlights the limiting chip.
- [ ] Error states: search service down → retry + category-browse fallback; partial map failure still renders results.
- [ ] Bilingual/RTL search header, chips, and results render correctly; AED tabular.

---

# Sprint 7 — Listing Details

### Objective
Elevate the listing detail page to Airbnb-grade desire + trust, and ship **Similar Products** (pgvector) and **Favorites**. Definition of done: a buyer views a rich listing detail with working gallery, full trust panel, similar-product recommendations, can favorite it, and report it; sold/deleted/error states all handled.

### Tasks
- **Embeddings:** worker generates `listing_embeddings` (text+image) on publish; `ivfflat` nearest-neighbor RPC for "Similar products" scoped to category/emirate.
- **Detail polish** (ui-spec §3): full-screen lightbox + keyboard nav, shared-element zoom from card, sticky action card (Message/Save/Share + seller trust card with verified badge, rating, response time, member-since), approximate (area-level) map for privacy, urgent countdown, safety note.
- **Favorites:** `favorites` writes with optimistic heart; "Saved" surfaces in account hub.
- **Report listing:** `reports` insert (target_type=listing) from the detail page; reason picker; feeds moderation queue.
- **Share:** native share / copy link with OG meta tags (SSR) for rich previews.
- **View counter:** increment `listings.view_count` (debounced/deduped per session) via RPC.
- **Owner-on-own-listing** view: Edit / Mark sold / Promote (Urgent) inline.
- **Sold/expired/deleted** states: overlays, disabled contact, emphasized similar rail; not-found page.
- SEO/SSR: server-render detail pages, canonical URLs, JSON-LD product schema, sitemap entries.

### Files
```
packages/db/supabase/migrations/0006_embeddings_favorites_reports.sql   (similar RPC, view-count RPC, favorites/reports RLS)
apps/worker/src/processors/embedListing.ts
apps/web/app/listing/[id]/page.tsx                          (SSR + OG + JSON-LD)
apps/web/components/listing/SimilarProducts.tsx · ShareButton.tsx · ReportDialog.tsx · UrgentCountdown.tsx · ContactPanel.tsx
apps/web/components/listing/FavoriteButton.tsx
apps/web/app/account/saved/page.tsx                         (favorites list)
packages/llm/src/embeddings.ts · apps/web/lib/listings/similar.ts
packages/contracts/src/report.ts · favorite.ts
```

### Testing checklist
- [ ] Embedding generated on publish; "Similar products" returns relevant, same-category neighbors; hidden gracefully when none.
- [ ] Gallery + lightbox keyboard/swipe nav; shared-element transition smooth; single-image handled.
- [ ] Favorite toggles optimistically, persists, rolls back on failure; appears in account Saved; RLS keeps favorites private.
- [ ] Report submits with reason, creates `reports` row, lands in moderation queue; duplicate-report handling sane.
- [ ] Share produces correct OG/JSON-LD preview; copy-link works.
- [ ] View count increments without double-counting on refresh within a session.
- [ ] Owner sees Edit/Mark-sold/Promote; non-owner sees Message/Save/Report.
- [ ] Sold/expired/deleted/not-found states render correctly; contact disabled where appropriate.
- [ ] Not-signed-in "Message" raises auth sheet and returns to intent.
- [ ] SSR detail page indexable; sitemap includes active listings; AA accessibility + RTL pass.

---

# Sprint 8 — Messaging

### Objective
Real-time, trustworthy buyer↔seller chat (one thread per listing+buyer) with safety baked in. Definition of done: a buyer messages a seller from a listing, both exchange messages in real time with read receipts and unread counts, can send images, and block/report; scam patterns are flagged.

### Tasks
- Migration: `conversations`, `messages` (RLS: participants only; insert guarded by `is_conversation_participant` and not-blocked), unread-counter and `last_message_at` triggers. Plan `messages` monthly **partitioning** for scale.
- **Realtime:** Supabase Realtime subscription on `messages`/`conversations`; typing indicator; presence optional.
- **Conversation creation:** from listing "Message seller" → upsert conversation (unique listing+buyer); inject listing context card.
- **Messaging UI** (ui-spec §6): two-pane desktop (list + thread), mobile list→thread screens; composer with text + image attach (Storage `message-attachments` bucket, owner/participant RLS); quick-reply chips; day dividers; read receipts; pinned listing-context card.
- **Safety:** persistent first-time safety banner; **scam detector** (worker/Edge Function flags off-platform-payment/advance-fee patterns → set `messages.flagged`, surface caution); block/report/archive actions; blocked thread disables composer.
- **Notifications:** push/email on new message when recipient offline (channel wired in Sprint 10 notifications, hook here).
- **Unread badges** in global nav; mark-as-read on thread open.

### Files
```
packages/db/supabase/migrations/0007_messaging.sql          (conversations, messages, RLS, counter/last_message triggers, partition plan)
apps/web/app/messages/page.tsx · messages/[conversationId]/page.tsx
apps/web/components/messages/ConversationList.tsx · Thread.tsx · MessageBubble.tsx · Composer.tsx · QuickReplies.tsx · ListingContextCard.tsx · SafetyBanner.tsx · BlockReportMenu.tsx
apps/web/lib/realtime/messages.ts · lib/storage/messageAttachments.ts
apps/worker/src/processors/scamDetect.ts
apps/web/components/nav/UnreadBadge.tsx
packages/contracts/src/messaging.ts
```

### Testing checklist
- [ ] Buyer starts a conversation from a listing; unique per (listing, buyer) — second attempt reuses the thread.
- [ ] Messages deliver in real time both directions; read receipts and unread counts accurate; nav badge updates.
- [ ] RLS: only the two participants (and staff) can read/insert; a third user is denied.
- [ ] Image attachment uploads, renders, respects Storage RLS; oversized/unsafe rejected inline.
- [ ] Send-failure shows "tap to retry", message preserved; offline queue delivers on reconnect; "reconnecting" chip shows.
- [ ] Block disables composer and hides thread per policy; report files a `reports` row; archive works.
- [ ] Scam pattern message gets `flagged` and surfaces a caution.
- [ ] Suspended counterpart → system message + disabled composer.
- [ ] Empty states: no conversations, freshly-created empty thread, search-no-results.
- [ ] Mobile list→thread navigation, sticky composer above keyboard, deep-link from push.
- [ ] Bilingual/RTL bubbles and composer; AA accessibility.

---

# Sprint 9 — Verification

### Objective
Complete the trust ladder: email verification and **Emirates ID verification via UAE PASS** (with manual-document fallback), driving the **Verified badge**. PDPL-grade PII handling. Definition of done: a user completes Emirates ID verification through UAE PASS, gains the verified badge across the app, and one Emirates ID can verify only one account.

### Tasks
- **Email verification:** request/confirm flow; set `users.has_email_verified`, update `verifications`.
- **UAE PASS OIDC:** integrate as an Edge Function / server route (start + callback); receive verified identity claims; write `verification_requests` (type=emirates_id, source=uae_pass) and **`eid_number_hash` (HMAC)**; the **unique index enforces one-EID-one-account**. On success: `users.has_eid_verified=true`, `profiles.badge_level='verified'`.
- **Manual-document fallback:** upload front/back to a **private** Storage bucket (`kyc`, staff-read via RLS only); creates a `pending` verification request routed to admin review (Sprint 10).
- **PII minimization & PDPL:** store only references/HMAC in `verification_requests` (no raw EID columns); field-level encryption for any sensitive doc metadata; **auto-purge** manual KYC images after approval per retention policy (scheduled job); access to KYC objects audited.
- **Verified badge propagation:** ensure `profiles.badge_level` drives the VerifiedBadge component everywhere (cards, detail, profile, chat header).
- **Verification center UI** (account hub): mobile ✓ / email / Emirates ID states, start flows, status feedback, error/retry without losing uploaded docs.
- **Trust effects:** verified sellers may get auto-approval/raised listing limits (ties to moderation in Sprint 10).

### Files
```
packages/db/supabase/migrations/0008_verification.sql       (verification_requests refinements, eid_hash unique idx, kyc bucket RLS, purge job)
apps/web/app/account/verification/page.tsx                  (full flows)
apps/web/app/api/uaepass/start/route.ts · api/uaepass/callback/route.ts   (or Edge Functions)
apps/web/components/verification/EmailVerify.tsx · UaePassButton.tsx · ManualEidUpload.tsx · VerificationStatus.tsx
apps/worker/src/processors/kycPurge.ts
packages/llm/_n/a · apps/web/lib/verification/*.ts
packages/contracts/src/verification.ts · docs/pdpl-kyc.md
```

### Testing checklist
- [ ] Email verify request → confirm → `has_email_verified=true`; expired/invalid token handled.
- [ ] UAE PASS happy path: start → callback → claims stored → `has_eid_verified=true`, badge becomes "verified" everywhere.
- [ ] **One EID = one account:** a second account attempting the same EID is rejected via the unique `eid_number_hash` index.
- [ ] Manual fallback: docs upload to private bucket; only staff can read; creates pending request.
- [ ] No raw Emirates ID number stored in plaintext; only HMAC/encrypted references present.
- [ ] KYC image purge job removes manual docs post-approval per policy; access to KYC objects is audit-logged.
- [ ] Verified badge renders consistently on card, detail, profile, chat header.
- [ ] Verification errors preserve uploaded docs and allow retry; clear UX throughout.
- [ ] RLS: a user reads only their own `verification_requests`; staff can read for review.
- [ ] UAE PASS failure/cancel returns the user gracefully with a retry path.

---

# Sprint 10 — Admin Dashboard

### Objective
Stripe-grade operational console (separate auth domain, RBAC, mandatory 2FA) for moderation, users, KYC review, reports, analytics, and an immutable audit log — plus the **notification delivery** backbone. Definition of done: a moderator triages the listing queue and resolves reports; an admin suspends a user and reviews KYC; every mutating action is captured in `admin_actions`.

### Tasks
- **Admin app shell** (`apps/admin` or gated `/admin` routes): role-aware sidebar nav, top bar with 2FA status + global search, **mandatory TOTP 2FA** for staff, IP-allow-list for high-privilege actions.
- **Moderation queue:** prioritized table of listings needing review (source ai/report/new_seller) with inline **AI verdict + reasons**; detail drawer with images/seller-trust; one-click Approve/Reject(reason)/Remove/Escalate; keyboard shortcuts; bulk actions. Each decision writes `admin_actions` + updates listing status in one transaction (via `SECURITY DEFINER` fn).
- **Reports management:** table by status/reason/target; resolve with action; links to offending entity.
- **Users management:** searchable table; detail with activity/reports/verification; Suspend/Ban/Reinstate/Verify with mandatory reason → `admin_actions`.
- **KYC review:** queue of pending `verification_requests`; minimal-PII reviewer view; approve/reject; sensitive access audited.
- **Analytics:** KPI cards + charts (listings created, GMV-proxy, conversations, search trends, urgent uptake, verification funnel) over a read path/replica; date-range + emirate/category filters; export.
- **Audit log:** immutable feed of `admin_actions` (insert-only RLS), filterable.
- **Notifications backbone:** finalize push (FCM/APNs) + email (transactional) delivery used by messaging + saved-search alerts; `device_push_tokens`; user notification preferences; unsubscribe.
- **Moderation pipeline wiring:** new/edited listings → AI moderation verdict → auto-approve trusted/verified, else queue (closes the loop from Sprints 4–5).

### Files
```
packages/db/supabase/migrations/0009_admin_moderation.sql   (moderation queue view/fns, admin_actions RLS insert-only, SECURITY DEFINER action fns, device_push_tokens)
apps/admin/                                                 (app shell, layout, auth + 2FA, RBAC guards)
apps/admin/app/overview/page.tsx · moderation/page.tsx · reports/page.tsx · users/page.tsx · verifications/page.tsx · analytics/page.tsx · audit/page.tsx
apps/admin/components/{KpiCard,DataTable,DecisionBar,DetailDrawer,RoleGuard,GlobalSearch}.tsx
apps/worker/src/processors/moderateListing.ts · notify.ts (push/email)
packages/notifications/src/{push.ts,email.ts,prefs.ts}
packages/contracts/src/admin.ts
```

### Testing checklist
- [ ] Staff login requires TOTP 2FA; high-privilege actions enforce IP allow-list; non-staff cannot reach `/admin` (RLS + route guard).
- [ ] RBAC: moderator sees fewer actions/views than admin; super_admin-only ops gated.
- [ ] Moderation decision updates listing status **and** writes `admin_actions` atomically; double-moderation conflict shows "already handled by X".
- [ ] Reject/suspend/ban require a reason; reason persisted in audit.
- [ ] Reports resolve and link correctly; KYC approve/reject works with minimal-PII view; KYC access audited.
- [ ] Audit log is append-only — update/delete denied by policy; entries filterable and complete (who/what/when/why).
- [ ] Analytics KPIs/charts render with date-range + filters; export works; runs off read path without impacting prod.
- [ ] Notifications: new message + saved-search match deliver via push/email respecting user prefs; unsubscribe honored; invalid tokens pruned.
- [ ] Moderation pipeline: trusted/verified seller auto-approves; risky listing routes to queue.
- [ ] Empty states (clear queue, no reports) and error states (action conflict, permission denied, 2FA expired re-auth, bulk partial failure) all handled.
- [ ] Bulk action partial-failure reports per-row results.

---

# Sprint 11 — Deployment

### Objective
Production-harden infrastructure for 100k users in-region: data residency, scaling, security hardening, observability, backups/DR, and the full CI/CD release pipeline. Definition of done: production runs in a UAE region with monitoring, automated backups + tested restore, rate limiting, WAF/CDN, and a documented, repeatable release process.

### Tasks
- **Data residency:** confirm Supabase + Storage + logs in a UAE/near region per PDPL; document data-flow and sub-processors.
- **Infra as code:** capture project config, buckets, RLS, Edge Functions, env vars, custom domains; promotion path local→staging→prod.
- **Scaling:** Postgres connection **pooler (PgBouncer transaction mode)** for web; reserved connections for worker/migrations; apply `messages`/`audit`/`search_events` partitioning + scheduled partition pre-creation; index/`EXPLAIN` review on hot paths; CDN for images.
- **Edge/security:** **WAF + CDN + DDoS** in front of web; TLS 1.3 + HSTS; security headers/CSP; **rate limiting** (OTP, AI, search, messaging) at edge + app; secrets in vault; service_role key isolated to worker.
- **Observability:** Sentry (web+worker), uptime checks, DB/queue/AI-cost dashboards + alerts (error rate, p95 latency, queue depth, AI spend, auth anomalies, PII-access).
- **Backups & DR:** automated encrypted backups + **PITR**; **restore drill**; storage versioning; documented RTO/RPO + runbook.
- **Release pipeline:** migration gating (forward-only, reviewed), staged rollout, smoke tests post-deploy, **rollback** procedure, feature flags for risky features.
- **Cost guardrails:** AI spend caps/alerts, storage lifecycle policies.

### Files
```
infra/                          (IaC: project config, dns, waf/cdn, env management)
.github/workflows/deploy-prod.yml · release.yml · migrate.yml
packages/db/supabase/migrations/0010_partitioning_scaling.sql   (partitions, pooler notes, scheduled jobs)
apps/web/middleware.ts          (security headers, rate-limit hooks)
docs/runbooks/{deploy,rollback,backup-restore,incident,dr}.md
docs/observability.md · docs/data-residency-pdpl.md
monitoring/dashboards/*.json · alerts/*.yml
```

### Testing checklist
- [ ] Production confirmed in a UAE/near region; data-residency doc complete; PII never leaves jurisdiction.
- [ ] Connection pooler handles a simulated concurrent load without exhaustion; partitions auto-create ahead of time.
- [ ] WAF/CDN/DDoS active; TLS 1.3 + HSTS + CSP + security headers verified (e.g. observatory scan).
- [ ] Rate limits enforced on OTP/AI/search/messaging at the edge and app; abuse simulated and blocked.
- [ ] Sentry + uptime + DB/queue/AI-cost dashboards live; alerts fire on injected error/latency/spend thresholds.
- [ ] Automated backups present; **PITR restore drill succeeds** into a scratch project; RTO/RPO documented and met.
- [ ] Deploy → smoke tests pass; **rollback rehearsed** and works; forward-only migration gate enforced.
- [ ] Feature flags toggle risky features without redeploy.
- [ ] AI spend cap/alert triggers correctly; storage lifecycle purges per policy.
- [ ] service_role key absent from any client bundle; secret scan clean.

---

# Sprint 12 — Production QA

### Objective
Full pre-launch verification: end-to-end functional, security, performance/load to 100k-scale, accessibility, bilingual/RTL, compliance, and a beta gate. Definition of done: a documented, passing QA run across all surfaces; sign-off checklist green; beta cohort live with feedback loop and a go/no-go decision.

### Tasks
- **E2E regression suite (Playwright):** core journeys — signup, AI-listing create→publish, search→detail→favorite, message→reply, verification, report→moderate, admin actions. Run in CI against staging.
- **Load & soak testing (k6/Artillery):** simulate 100k users / peak concurrency on search, feed, listing detail, messaging realtime, AI job throughput; verify p95 latency and error budgets; find DB hot spots; tune indexes/pooler.
- **Security review:** authn/authz/RLS audit (every table, every role), OWASP Top 10, dependency + secret scan, **third-party pen test** on auth, RLS bypass attempts, IDOR, file-upload safety, payment surfaces; fix-verify loop.
- **Accessibility audit:** WCAG 2.1 AA across pages (keyboard, screen reader incl. Arabic, contrast, touch targets, reduced-motion); fix and re-test.
- **Bilingual/RTL QA:** every page in EN + ع; mirrored layout, number/currency formatting, no truncation/overflow.
- **Compliance (PDPL):** consent flows, **data export + account deletion** end-to-end, retention/purge jobs verified, privacy policy + terms + safety center published, breach-notification runbook.
- **Content moderation validation:** prohibited-goods/scam/NSFW detection precision/recall sampled; human-review SLA defined.
- **Cross-device/browser matrix:** iOS/Android Safari/Chrome, desktop browsers, slow-network and offline behavior.
- **Beta launch:** limited cohort behind flags; analytics + feedback channel; bug triage; **go/no-go** review against the sign-off checklist.

### Files
```
e2e/                            (playwright specs: auth, listing, search, messaging, verification, admin)
load/                           (k6/artillery scenarios + thresholds)
docs/qa/{test-plan,security-review,a11y-audit,rtl-checklist,pdpl-compliance,launch-signoff}.md
docs/qa/pentest-findings.md · docs/qa/load-results.md
.github/workflows/e2e.yml · load-test.yml
legal/{privacy-policy,terms,safety-center}.md
```

### Testing checklist
- [ ] Full E2E suite green in CI across all core journeys; flaky tests quarantined/fixed.
- [ ] Load test sustains target concurrency; p95 latency + error rate within budget; no connection exhaustion; hot paths tuned.
- [ ] Realtime messaging holds under concurrent load; AI worker throughput meets demand without backlog.
- [ ] Pen test findings triaged; criticals/highs fixed and re-verified; no RLS bypass / IDOR / unsafe upload remains.
- [ ] RLS matrix test: every (role × table × operation) behaves per policy.
- [ ] WCAG 2.1 AA pass on every page (EN + Arabic), including screen-reader and reduced-motion.
- [ ] Bilingual/RTL: all pages mirrored, formatted, no overflow; locale persists.
- [ ] PDPL: data export returns the user's full data; account deletion cascades and purges; retention jobs verified; policies published.
- [ ] Moderation detection sampled for precision/recall; human-review SLA documented.
- [ ] Device/browser matrix passes; offline/slow-network degrade gracefully.
- [ ] Beta cohort live; analytics + feedback flowing; launch sign-off checklist fully green; go/no-go recorded.

---

## Post-launch (fast-follow backlog, not gating)
- React Native (Expo) mobile apps consuming `packages/contracts`.
- OpenSearch migration when catalog volume outgrows Postgres FTS.
- Payments/promotions gateway (PayTabs/Telr/Network International) for Urgent/Featured at scale.
- Seller ratings/reviews depth; reputation/trust-score model.
- Recommendation tuning from `search_events` + engagement.
```
