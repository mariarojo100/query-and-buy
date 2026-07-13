# Risk & Rollback Plan — Supabase → Self-Managed Migration

> Companion to [MIGRATION_BLUEPRINT.md](MIGRATION_BLUEPRINT.md) and [MIGRATION_TASKS.md](MIGRATION_TASKS.md).

---

## 1. Risk register

| # | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| R1 | **Authorization regression**: an RLS rule not faithfully translated → cross-user data exposure (messages, orders, contact reveal are the crown jewels) | Medium | Critical | **HIGH** | 32-row policy catalog (BLUEPRINT §5) with mandatory allow+deny test pairs; lint-enforced repository choke point; code review checklist keyed to the catalog; optional retained native RLS on `messages`, `orders`, `users` as backstop |
| R2 | **Password import failure** (hash format mismatch, null hashes for OAuth-only users) | Low | High | MEDIUM-HIGH | Supabase uses bcrypt (verified against `auth.users.encrypted_password`); dry-run includes real bcrypt verification of sampled accounts; OAuth-only users handled explicitly (no credentials row → Google or reset flow) |
| R3 | **Google account linking mistakes** (duplicate user created, or wrong account linked) | Medium | High | MEDIUM-HIGH | Import `auth.identities.provider_id` → `auth_accounts` before cutover so returning users match by provider id, not email; link-by-email only for *verified* emails; E2E tests for first-time and returning Google users |
| R4 | **Cutover data loss** (writes during migration window, missed storage objects) | Low | Critical | MEDIUM | Hard write freeze (maintenance mode); verification script gates unfreeze (row counts, checksums, counter recounts); rclone `--checksum` final sync; Supabase paused not deleted |
| R5 | **Connection exhaustion on Vercel** (serverless × self-managed PG) | Medium | Medium | MEDIUM | Pooler (pgbouncer transaction-mode / RDS Proxy) from Phase 0; load test on Preview; alert on connection count |
| R6 | **All sessions invalidated at cutover** (user friction, support load) | Certain | Low | LOW-MEDIUM | Pre-announce; friendly re-login screen; password reset path verified before cutover |
| R7 | **Signup-bundle transaction bugs** (replacing `handle_new_user` trigger, which currently swallows errors) | Medium | Medium | MEDIUM | Single transactional code path with tests for username collisions, duplicate email, OAuth metadata edge cases; unlike the trigger, failures surface — monitor signup error rate in hypercare |
| R8 | **Search/geo/FTS behavior drift** (tsvector, trigram, PostGIS on new host) | Low | Medium | LOW-MEDIUM | Schema ported verbatim incl. generated column + indexes; staging comparison of top-20 search queries' results and `EXPLAIN` plans |
| R9 | **Realtime downgrade to polling perceived as regression** (chat latency) | Medium | Low | LOW | 5s visible-tab polling ≈ acceptable for negotiation chat; SSE upgrade path pre-designed (TARGET_ARCHITECTURE §6) |
| R10 | **Phone verification provider swap** (Twilio Verify differences, UAE number formats) | Medium | Low | LOW | Feature is self-contained; can ship cutover with phone verification temporarily disabled if Twilio isn't ready — flags preserved from migrated data |
| R11 | **Storage URL rewrite misses** (avatar URLs embedded in `profiles.avatar_url`) | Low | Low | LOW | Single UPDATE with host match + verify query (`where avatar_url like '%supabase%'` must return 0); listing images use keys, unaffected |
| R12 | **Ops burden of self-managed PG** (backups, upgrades, monitoring — a permanent cost, not a one-time risk) | Certain | Medium | MEDIUM | Day-1 requirements: automated daily backups + WAL/PITR, restore drill during P0, disk/connection/replication alerts. Budget this before committing to the migration |

**Overall risk level: MEDIUM** — concentrated in R1–R4, all of which have concrete, testable mitigations.

---

## 2. Testing checklist

### 2.1 Automated — policy matrix (blocks P9)

One **allow** and one **deny** test per row of BLUEPRINT §5 (32 rows). Deny examples that must fail closed:

- [ ] User B cannot read user A's account row, favorites, saved searches, notifications, listing_views, reports.
- [ ] User B cannot read a conversation/messages/orders/offers between A and C.
- [ ] Non-participant cannot send a message; participant cannot send into a `blocked` conversation.
- [ ] User cannot set `profiles.phone_verified`, `rating_avg`, `listings_count`, `trust_score`, `badge_level` via profile update (column allowlist).
- [ ] User cannot create a listing with `seller_id` ≠ self; cannot update/delete another seller's listing; cannot see another's `draft`/`rejected`/`deleted` listing.
- [ ] Buyer of a `reserved` listing CAN still read it (order-participant read — the subtle 110020 rule).
- [ ] Review insert rejected when order not `completed`, when reviewer isn't a participant, when reviewee isn't the counterpart, and on duplicate (order_id, reviewer_id).
- [ ] Non-admin blocked from every admin repo function and `/admin` route; non-staff cannot read admin_actions, audit log, ai_moderation_log, feedback list.
- [ ] Anonymous viewer: sees only active listings, public profiles, public reviews, categories, marketplace settings; can submit feedback.
- [ ] Presign action refuses keys outside `viewer.id/`, oversized files, non-image MIME; storage delete refuses foreign key prefixes.

### 2.2 Automated — auth flows (blocks P9)

- [ ] Email/password signup → users+profiles+user_roles+credentials rows created atomically; username generated; verify email → both verified flags set.
- [ ] Login with **imported** Supabase bcrypt hash.
- [ ] Google first login (bundle created, avatar/display name populated) and returning login (matched by provider id, no duplicate user).
- [ ] Forgot/reset password round trip; token single-use + expiry.
- [ ] Phone OTP happy path + wrong-code + expiry; flags written to both users and profiles.
- [ ] Middleware: each of the 7 protected prefixes redirects anonymous → `/login?redirectTo=…` and honors it after login; logged-in users bounced off `/login`/`/signup`.
- [ ] Session invalidation on signOut.

### 2.3 Data migration verification (gates unfreeze at P9; rehearsed in dry runs)

- [ ] Row count per table: Supabase == target (all 27 tables).
- [ ] Per-table id checksum (`md5(string_agg(id::text, ',' order by id))`) match.
- [ ] `recount_seller_listings` / `recount_user_reports` recomputation == migrated denormalized values.
- [ ] Credential spot-check: bcrypt-verify N known test accounts.
- [ ] `auth_accounts` count == Google identities count; sample provider_id match.
- [ ] `select count(*) from profiles where avatar_url like '%supabase%'` == 0.
- [ ] Storage: object count + total bytes per bucket match (`rclone check`).
- [ ] Schema diff script clean (P1 artifact re-run against production target).

### 2.4 Manual E2E regression (staging, full pass before P9)

- [ ] Browse home/category/search (filters, sort, pagination, urgent, featured); listing detail with image gallery.
- [ ] Sell flow: AI generation, image upload (multiple), publish; edit listing incl. image add/remove; my-listings status changes (active↔reserved↔sold, delete).
- [ ] Full negotiation: start conversation → chat (check polling refresh) → offer → counter → accept → listing reserved → both confirm → completed → contact reveal → both directions of review → reputation/rating updates.
- [ ] Favorites, saved searches (save/re-run/delete), notifications (bell badge, mark read, preferences), profile edit + avatar upload, public profile page, share.
- [ ] Admin: every /admin page renders with data; moderate a listing, suspend a user, resolve a report, edit categories, edit settings; audit log rows appear; `forbidden()` for non-admin.
- [ ] Emails received: verify, reset, offer/chat/order/review notifications (respecting preferences); `email_failures` logging on forced failure.
- [ ] Sitemap renders; robots; OG images; JSON-LD; images served from new host via `next/image`.
- [ ] Feedback widget, report flows (listing + user).
- [ ] Load test: browse + chat polling at expected concurrency; watch pooler saturation (R5).

---

## 3. Rollback plan

**Master principle: production runs on Supabase, untouched, until the P9 cutover — so for Phases 0–8 rollback is trivial (abandon branch, nothing to undo).** The plan below is about P9 and after.

### 3.1 Rollback anchors (set up before cutover)

1. Supabase project stays live through cutover, then **paused — never deleted** for ≥30 days.
2. The write freeze means the Supabase dataset at cutover is a complete, consistent snapshot — it *is* the rollback dataset.
3. The previous Vercel deployment (Supabase-based build) remains one click away ("Instant Rollback").
4. Old env vars retained in Vercel (values unchanged) for the stabilization window.
5. Google OAuth app keeps the Supabase redirect URI during the window.
6. Storage: original Supabase buckets untouched (sync was copy, not move).

### 3.2 Rollback procedures by moment of failure

| Moment | Procedure | Data at risk |
|---|---|---|
| **During cutover window** (verification fails, load errors) | Abort: do not flip env vars; lift maintenance mode on the existing Supabase deployment. | **None** (freeze was in effect) |
| **First hours after cutover** (critical bug: auth broken, authz leak, data corruption) | Re-freeze → Vercel Instant Rollback to Supabase build → restore env vars → unpause Supabase → unfreeze. | Writes made on the new stack since cutover are lost unless back-migrated; keep the window short by monitoring the hypercare checklist (§3.3). For an *authz leak* specifically: roll back first, assess exposure second |
| **Days 1–14** (serious but non-critical issues) | Prefer fix-forward (new stack is fully under our control — that's the point of the migration). Rollback still possible via reverse data migration: `pg_dump` new → transform auth tables back → restore into unpaused Supabase; storage `rclone sync` reverse; sessions invalidated again. Cost: a second maintenance window | Bounded by the reverse-migration runbook |
| **After stabilization** (≥2 weeks clean) | Rollback window closed: delete Supabase env vars, run the P9 deletion checklist, keep the paused project 30 more days as archive | — |

### 3.3 Hypercare monitoring (first 72h after cutover)

- [ ] Error-rate dashboards: signup, login (credentials + Google), middleware redirects.
- [ ] DB: connection count vs pooler cap, p95 query latency, slow-query log.
- [ ] 404/403 spikes on image URLs (storage rewrite misses).
- [ ] Support channel watch for: "can't log in", "my listing is gone", "I can see someone else's X" (the last one = immediate rollback trigger per R1).
- [ ] Signup success-rate vs pre-migration baseline (R7 — trigger used to swallow failures, so *new* visible errors may actually be pre-existing).

### 3.4 Go/no-go gate for P9

All must be true:

1. Policy matrix (2.1) and auth suite (2.2) green in CI.
2. Two consecutive clean data-migration dry runs (2.3 checklist automated).
3. Manual regression (2.4) signed off on staging.
4. Backups + restore drill completed on production Postgres (R12).
5. Rollback anchors (3.1) verified in place.
6. Maintenance window announced.

---

## 4. Effort & risk summary (restated from BLUEPRINT §11–12)

- **26–34 developer-days**, one senior full-stack developer; +20% if Prisma is chosen over Drizzle or for onboarding a second engineer.
- **Overall risk MEDIUM**: highest severity is authorization regression (R1) — mitigated by the policy catalog, mandatory deny-tests, and the lint-enforced data-access choke point; operational risk shifts permanently to the team (R12) and should be priced in before committing.
