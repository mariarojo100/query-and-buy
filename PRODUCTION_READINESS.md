# Production Readiness — Query & Buy (v0.9.0)

Status: **ready for invite-only / public beta on Vercel** (custom domain intentionally deferred).
Legend: ✅ verified by execution · 🔎 verified by inspection · ⚠ unable to verify in this environment / operator action required.

---

## 1. Production checklist
- ✅ `tsc --noEmit` passes (no type errors).
- ✅ `next build` passes — 44 routes compile, static generation succeeds.
- ✅ No `TODO`/`FIXME`/`HACK` in shipped code; no `debugger`.
- ✅ No stray `console.log` debug — the only console calls are the logger/email sinks and a dev-only analytics debug.
- 🔎 `localhost` appears only as a fallback for `NEXT_PUBLIC_SITE_URL`; production must set this env var (below).
- ✅ `X-Powered-By` disabled.
- ⚠ Set all environment variables in Vercel (Production scope) — see §6.

## 2. Security checklist
- ✅ **Security headers** live: CSP, HSTS (2y, preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- ✅ **CSP** enforced (`default-src 'self'`; scoped img/connect/font; `frame-ancestors/object-src 'none'`). ⚠ `script/style` still need `'unsafe-inline'` (App Router) — next step is nonce-based CSP via middleware.
- 🔎 **RLS** enabled on all tables with owner/participant/admin policies (migrations `…110008` + per-feature). Deny-all on `listing_embeddings`, `email_failures`, `search_log` (service-role only). ⚠ Run `scripts/audit_rls.sql` in the Supabase SQL editor to confirm against the live DB (no DB creds here).
- 🔎 **AuthZ:** role matrix (`user_roles`) + `is_admin()/is_staff()` SECURITY DEFINER helpers; messaging/orders/offers locked to participants; sellers can only mutate their own listings (`seller_id = auth.uid()`); buyer↔seller contact revealed only after both confirm.
- 🔎 **Storage:** two public-read buckets (avatars 2 MB, listing-images 5 MB), owner-scoped writes by path prefix, MIME allowlist.
- ✅ **Rate limiting** (best-effort, per-instance) on AI listing generation + conversational search. ⚠ Move to Upstash/Redis for multi-instance correctness; add anon/IP limiting via edge middleware.
- ✅ **Account-enumeration** mitigated on login; reset flow always reports success.
- ✅ **Secrets** never client-exposed (only `NEXT_PUBLIC_*` reach the client); logger redacts secrets/PII.
- 🔎 **Cookies:** Supabase SSR uses HttpOnly + Secure + SameSite session cookies.

### OWASP / vulnerability review (Phase 6)
| Vector | Assessment |
|---|---|
| SQL injection | 🔎 Low — PostgREST/parameterized client; no raw SQL string concatenation. Search input is sanitized before `or()`/FTS. |
| XSS | 🔎 Low — React auto-escaping; JSON-LD via controlled serializer; no `dangerouslySetInnerHTML` on user data; CSP backstop. |
| CSRF | 🔎 Mitigated — Next Server Actions are POST + origin-checked; SameSite cookies. ⚠ No explicit anti-CSRF token layer. |
| SSRF | 🔎 Low — server only calls fixed hosts (Supabase, Gemini, Resend); no user-supplied URL fetching. |
| Open redirect | 🔎 Mitigated — OAuth `next`/`redirectTo` constrained to same-origin paths (`startsWith('/')`). |
| Clickjacking | ✅ `frame-ancestors 'none'` + `X-Frame-Options: DENY`. |
| IDOR | 🔎 Mitigated by RLS — row access keyed to `auth.uid()`; ⚠ confirm via `audit_rls.sql`. |
| Path traversal | 🔎 Storage paths derived from `auth.uid()`; no filesystem path from user input. |
| Command injection | 🔎 None — no shell/`exec` on user input. |
| File upload | 🔎 Client+bucket MIME allowlist, size caps (2/5 MB), images re-encoded client-side; ⚠ no server-side content/AV scan. |
| Auth bypass / privilege escalation | 🔎 Admin gated by `is_admin()` + `user_roles`; service-role only server-side. |

## 3. SEO checklist
- ✅ Dynamic metadata + canonicals (`metadataBase`, per-page `alternates.canonical`).
- ✅ `sitemap.ts` (categories, listings, profiles; hourly revalidate) and `robots.ts` (disallows auth areas).
- ✅ JSON-LD: Organization, WebSite (+SearchAction), Product (listings), BreadcrumbList, **FAQPage (new)**.
- ✅ Open Graph + Twitter cards; **generated OG image (new)**.
- ✅ 404 (`not-found.tsx`), error boundaries (`error.tsx`, `global-error.tsx`).
- 🔎 Internal linking (footer/help/FAQ/breadcrumbs) present.
- ⚠ Future: pagination metadata (`rel=prev/next`) on long category lists; per-listing dynamic OG images.

## 4. Performance checklist
- ✅ `next/image` (AVIF/WebP) for listing/avatar images; client-side downscale before AI upload.
- ✅ `optimizePackageImports` for lucide; self-hosted fonts via `next/font`.
- ✅ Server Components by default; mutations via Server Actions (no client data-fetching waterfalls).
- 🔎 FTS (tsvector) + indexes on listings; AI search has heuristic fallback (no hard dependency).
- ⚠ Future: ISR/edge caching on listing & category pages; Upstash cache for hot reads; pagination; trigram/pgvector search at scale; route-level `loading.tsx` on all routes (present on listing/profile).

## 5. Error handling & logging (Phases 9–10)
- ✅ Friendly errors everywhere: AI failures fall back to heuristics; auth shows friendly text; raw errors logged, never shown.
- ✅ Structured JSON logger with secret/PII redaction and `info/warn/error/security/audit` channels.
- 🔎 Admin actions persisted to `admin_audit_log` (append-only).
- ⚠ No external error monitoring yet — add Sentry/Datadog (swap the logger sink) before scaling.

## 6. Deployment checklist (Vercel — no custom domain)
1. Keep GitHub `main` connected to Vercel (auto-deploy). CI (`tsc`) runs on push/PR; Vercel runs the full build.
2. Set **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `NEXT_PUBLIC_SITE_URL` = the Vercel URL (e.g. `https://query-and-buy.vercel.app`)
   - `GEMINI_API_KEY`, `AI_PROVIDER=gemini`
   - `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`
3. In **Supabase → Auth → URL config**: Site URL = the Vercel URL; Redirect URLs include `https://<vercel-url>/auth/callback` and `http://localhost:3000/auth/callback`.
4. In **Google Cloud**: authorized redirect URI = `https://<project>.supabase.co/auth/v1/callback`.
5. Apply DB migrations (`npm run db:push`) and run `scripts/audit_rls.sql`.
6. **Do not** attach the custom domain yet (deferred).
7. After deploy: browser smoke-test the CSP (watch console for violations) and the auth flows.

## 7. Remaining future improvements (prioritized)
1. **Nonce-based CSP** (remove `'unsafe-inline'` for scripts).
2. **Distributed rate limiting** (Upstash) + anon/IP limiting at the edge.
3. **External monitoring** (Sentry) + uptime checks.
4. **Server-side image moderation/AV** for uploads.
5. **ISR/edge caching** + pagination for feed/search; cache layer for hot reads.
6. **CI build job** with secrets (currently typecheck-only; Vercel is the build gate).
7. **Wire a real analytics provider** (the wrapper is ready).
8. Per-listing dynamic OG images; pagination metadata.
