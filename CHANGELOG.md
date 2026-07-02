# Changelog

All notable changes to Query & Buy. Format loosely follows [Keep a Changelog](https://keepachangelog.com); versions follow [SemVer](https://semver.org).

---

## [0.9.0] — 2026-06-30 — Production Hardening (public-beta candidate)

A hardening sprint (no new product features) to make the existing app ready for an invite-only / public beta on Vercel. UI and functionality were preserved.

### Security
- **Content-Security-Policy** added (default-src 'self'; scoped script/style/img/font/connect; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri`/`form-action 'self'`; `upgrade-insecure-requests`). Strictest policy compatible with the App Router without nonces.
- Tightened headers: `X-Frame-Options: DENY`, added `Cross-Origin-Opener-Policy: same-origin`, extended `Permissions-Policy`, disabled `X-Powered-By`.
- **Account-enumeration defence** on login (generic "Invalid email or password"; real reason logged via security channel only).
- **Best-effort rate limiting** (`lib/security/rateLimit.ts`) on the cost-sensitive AI endpoints (listing generation, conversational search). Fails open; per-instance (Upstash recommended for multi-instance).
- Logger gained dedicated **`security`** and **`audit`** channels (secret/PII redaction retained).
- Added `scripts/audit_rls.sql` to verify RLS/policies/buckets/RPCs against the live DB.

### Features (auth completeness, not product scope)
- **Password reset** flow: `/forgot-password` + `/reset-password` with `requestPasswordReset` / `updatePassword` server actions (recovery via the existing PKCE callback). "Forgot password?" link added to login.

### SEO
- **FAQPage JSON-LD** on `/faq` (rich snippets).
- **Generated OpenGraph image** (`app/opengraph-image.tsx`) for social/link previews.
- Added Google avatar host (`lh3.googleusercontent.com`) to `next/image` `remotePatterns`.

### Tooling / Docs
- Added **GitHub Actions CI** (`.github/workflows/ci.yml`) running `tsc --noEmit` on push/PR.
- Added `VERSION_HISTORY.md` and `PRODUCTION_READINESS.md`.

### Notes / known gaps (see PRODUCTION_READINESS.md)
- External error monitoring (Sentry/Datadog), distributed rate limiting (Upstash), and anon/IP rate limiting are **recommended, not yet implemented**.
- Live RLS verification must be run by the operator via `scripts/audit_rls.sql` (no DB credentials in this environment).
- Documentation note: the AI provider in code is **Google Gemini (`gemini-2.5-flash`)** behind a provider abstraction; earlier changelog entries referencing Claude reflect an initial plan, not the current implementation.

---

## 2026-06-23 — Architecture standardized (Phase 1 / MVP)

**Decision:** Query & Buy MVP standardized on:

- Next.js 15
- TypeScript
- Tailwind
- Shadcn UI
- Supabase
- Vercel
- (planned) Anthropic Claude API — superseded in implementation by Google Gemini behind the AI provider abstraction.

**Rejected:**

- NestJS
- OpenSearch

**Context:** ARCHITECTURE.md previously carried an exploratory NestJS + OpenSearch design. For a solo founder optimizing for fastest development, lowest cost, and production readiness at the first 10,000 users, the Supabase-first stack was selected. NestJS and OpenSearch are retained only as post-MVP scaling options. See [ARCHITECTURE.md](ARCHITECTURE.md) §0.5 "Rejected Alternatives (Phase 1)" and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## 2026-06-23 — AI provider finalized

**Decision (original plan):** Phase 1 would use Anthropic Claude. **Current implementation:** the AI layer is provider-agnostic (`lib/ai/provider.ts`) and ships with **Google Gemini `gemini-2.5-flash`**; OpenAI/Claude branches are templated for future use.

**Future flexibility:** Switching providers is a config (`AI_PROVIDER`) + single-class change, with no impact on product code.
