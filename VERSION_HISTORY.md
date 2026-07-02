# Version History — Query & Buy

A high-level record of completed sprints, their version, major improvements, and deployment milestones. Detailed per-release notes live in [CHANGELOG.md](CHANGELOG.md).

| Version | Date | Sprint | Major improvements | Deployment |
|---|---|---|---|---|
| 0.9.0 | 2026-06-30 | **Production Hardening** | CSP + security headers, rate limiting, password reset, login anti-enumeration, security/audit logging, FAQ schema, generated OG image, CI, readiness docs | Vercel (beta candidate; no custom domain) |
| 0.8.x | 2026-06 | Branding & search reliability | Q&B logo (header/auth/favicon), conversational-search heuristic fallback (Gemini 429-safe), forgiving keyword match ("phone"→iPhone), listing description placement | Vercel |
| 0.8.0 | 2026-06 | Google OAuth | Google sign-in on login/signup, PKCE callback, profile auto-provisioning trigger, session persistence fixes | Vercel |
| 0.7.0 | 2026-06 | Search Intelligence (Sprint 13) | Conversational/AI search parsing, smart search box, trending/suggestions, `search_log` | Vercel |
| 0.6.0 | 2026-06 | Production Readiness (Sprint 12) | SEO (sitemap/robots/JSON-LD), error/loading pages, structured logger, analytics wrapper, legal pages, cookie consent, feedback widget | Vercel |
| 0.5.0 | 2026-06 | Discovery & Personalization (Sprint 11) + profile redesign | Recently-viewed, personalized homepage, account hub, reputation/trust UI | Vercel |
| 0.4.0 | 2026-06 | Admin Portal (Sprint 10) | `/admin` (listings, users, moderation, reviews, orders, categories, settings, AI log, audit) | Vercel |
| 0.3.x | 2026-06 | Trust, orders, reviews, messaging (Sprints 8–9) | Buyer–seller chat, offers/orders state machine, reviews/ratings, reports, notifications + email (Resend), verification scaffolding | Vercel |
| 0.2.0 | 2026-06 | Marketplace core (Sprint 4A) | Listings feed, `/sell` create flow with image upload, listing detail, categories | Vercel |
| 0.1.0 | 2026-06 | Foundation | Auth (email/password), profiles, Supabase schema + RLS, design system | Vercel |

## Deployment milestones
- **Continuous deploy:** GitHub `main` → Vercel auto-build on every push.
- **Database:** Supabase migrations under `supabase/migrations/` applied via `npm run db:push`.
- **0.9.0 target:** invite-only beta, then public beta on the Vercel URL (custom domain intentionally deferred).

> Versions before 0.9.0 are reconstructed from sprint history for context; treat 0.9.0 as the first formally versioned, hardening-reviewed release.
