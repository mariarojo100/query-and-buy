# Deploying queryandbuy.com (VPS)

The site runs on a **VPS** (behind Cloudflare), deploys from
**`migrate/supabase-to-postgres-foundation`**, and is managed by **pm2**
(app name `queryandbuy`, dir `/opt/query-and-buy`). There is **no auto-deploy** —
you run the recipe below on the server over SSH.

## ⚠️ The one rule that keeps the site up

This repo is an npm **workspaces monorepo** — `packages/*` (web `@qb/shared`) and
`mobile/` (the Expo/React-Native app). **The VPS only runs the web app.** If you
run a bare `npm ci`, npm also tries to install the entire mobile toolchain
(Expo, React-Native, …), which **fails on the server, leaves `next` uninstalled,
and 502s the whole site.**

**Always install with the web app scoped in, mobile left out:**

```bash
npm ci --include-workspace-root -w packages/shared
```

Never run bare `npm ci` on the VPS.

## Deploy recipe

```bash
ssh <user>@<vps>
cd /opt/query-and-buy
git fetch origin
git reset --hard origin/migrate/supabase-to-postgres-foundation
npm ci --include-workspace-root -w packages/shared     # web app + @qb/shared only
npm run build                                          # must end: ✓ Compiled successfully
pm2 restart queryandbuy --update-env
```

Then reload https://queryandbuy.com.

## Environment (pm2 loads from the app's `.env` / `.env.local`)

Web + mobile API share the same server env. Beyond the existing web vars
(`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `GEMINI_API_KEY`,
`RESEND_*`, `TWILIO_*`), the mobile `/api/v1` backend needs:

| Var | Purpose | Required |
|---|---|---|
| `API_JWT_SECRET` | signs mobile session tokens (keep **stable**) | yes |
| `GOOGLE_MOBILE_CLIENT_IDS` | comma-sep iOS/Android OAuth client IDs for id_token verification | only for native Google sign-in |
| `APPLE_BUNDLE_ID` | Apple sign-in audience | only for Apple sign-in |

## Database migrations (not auto-run)

The recipe does **not** run migrations. Apply new SQL manually, idempotent:

```bash
export $(grep -E '^DATABASE_URL=' .env)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0005_mobile_backend_deploy.sql
```

(`0005` is the consolidated, re-runnable mobile-backend migration:
`refresh_tokens`, `push_tokens`, `blocked_users`, the auth tables, and the
`users.*_verified_at` columns. Already applied to prod 2026-07-21.)

## Rollback (if a deploy breaks the site)

```bash
cd /opt/query-and-buy
git reset --hard <last-good-commit>       # e.g. 7b3c60c = pre-mobile-integration
npm ci --include-workspace-root -w packages/shared
npm run build
pm2 restart queryandbuy --update-env
```

## Smoke test

```bash
curl -s https://queryandbuy.com/ -o /dev/null -w "site %{http_code}\n"
curl -s https://queryandbuy.com/api/v1/categories | head -c 100
```
Both should be `200` / `{"ok":true,...}`.
