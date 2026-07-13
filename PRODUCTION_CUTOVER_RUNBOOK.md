# Production Cutover Runbook — Supabase → self-managed PostgreSQL

**Audience:** the ops/infra team standing up and hosting the database.
**Status of the app:** the application migration is **complete and proven** — the
code runs end-to-end on self-managed Postgres (Auth.js sessions, authz, all
repositories). This runbook is only the *deploy* of that finished code.

**Golden rule of ordering:** do **not** merge/deploy the new code until the target
DB exists, data is migrated, and Vercel env vars are set. Deploying first = live
site with no database behind it. Follow the phases in order.

---

## Phase 0 — Provision the target (infra team)

Stand up **PostgreSQL 17** reachable from Vercel, with these extensions available:
`pgcrypto`, `postgis`, `vector` (pgvector), `pg_trgm`, `citext`.

- Reachability: Vercel's serverless functions connect over the public internet —
  expose the DB via a connection pooler / allowlist Vercel egress, or place a
  pooler (PgBouncer/pgcat) in front. Have **two** connection strings ready:
  a **direct** one (for `psql`/`pg_dump` admin work) and the **pooled** one
  (for the app's `DATABASE_URL`).
- Capacity: small to start (the marketplace dataset is tiny), but budget the
  **permanent ops cost** now — automated daily backups + WAL/PITR, a restore
  drill, and disk/connection/replication alerts (risk R12 in
  `RISK_AND_ROLLBACK_PLAN.md`).
- Provision an **S3-compatible bucket** for object storage (Cloudflare R2, AWS S3,
  or MinIO) with two "folders"/buckets: `avatars` and `listing-images`, plus a
  public base URL (custom domain / CDN) to serve them.

Deliverables out of Phase 0: `TARGET_DATABASE_URL` (direct + pooled), S3
endpoint + keys + public base URL.

---

## Phase 1 — Schema onto the target (once, ahead of time)

From a checkout of the `migrate/supabase-to-postgres-foundation` branch:

```bash
psql "$TARGET_DIRECT_URL" -v ON_ERROR_STOP=1 -f db/baseline/0000_extensions.sql
psql "$TARGET_DIRECT_URL" -v ON_ERROR_STOP=1 -f db/baseline/0001_schema.sql
psql "$TARGET_DIRECT_URL" -v ON_ERROR_STOP=1 -f db/baseline/0002_auth_tables.sql
```

Do **not** run `db/seed.sql` — categories and `marketplace_settings` arrive in the
data dump (Phase 3) with their real ids; seeding first collides.

---

## Phase 2 — Storage pre-sync (days ahead)

Supabase Storage exposes an S3 endpoint. Full-sync both buckets to the target now,
so the cutover-window delta is tiny:

```bash
rclone sync supabase-s3:avatars        r2:avatars        --checksum
rclone sync supabase-s3:listing-images r2:listing-images --checksum
```

---

## Phase 3 — Staging rehearsal (before the real thing)

Point the migration at a **staging** target and run it **twice** (idempotency check):

```bash
SOURCE_DATABASE_URL="$SUPABASE_DIRECT_URL" \
TARGET_DATABASE_URL="$STAGING_DIRECT_URL" \
SOURCE_SUPABASE_URL="https://<ref>.supabase.co" \
NEXT_PUBLIC_STORAGE_BASE_URL="https://<your-storage-host>" \
bash scripts/migrate-data/run.sh
```

`run.sh` does: apply baseline → `pg_dump --data-only --disable-triggers` load →
`migrate-auth.ts` (bcrypt hashes copied verbatim, Google identities linked,
verified flags set) → `rewrite-avatar-urls.ts` → `verify.ts`. Gate on `verify.ts`
reporting **zero FAIL** lines. Deploy a preview against staging and smoke-test
login + browse.

---

## Phase 4 — Cutover window (the real move)

Announce beforehand: **all users must re-login** afterward (refresh tokens/sessions
are intentionally dropped).

1. **Freeze writes** (maintenance mode / read-only) on the live Supabase app.
2. **Final storage sync** (small delta):
   ```bash
   rclone sync supabase-s3:avatars        r2:avatars        --checksum
   rclone sync supabase-s3:listing-images r2:listing-images --checksum
   rclone check supabase-s3:avatars r2:avatars
   ```
3. **Run the data migration** against the **production** target:
   ```bash
   SOURCE_DATABASE_URL="$SUPABASE_DIRECT_URL" \
   TARGET_DATABASE_URL="$TARGET_DIRECT_URL" \
   SOURCE_SUPABASE_URL="https://<ref>.supabase.co" \
   NEXT_PUBLIC_STORAGE_BASE_URL="https://<your-storage-host>" \
   bash scripts/migrate-data/run.sh
   ```
   Must end with `verify.ts` clean.

---

## Phase 5 — Vercel environment (set BEFORE deploying)

In the Vercel project → Settings → Environment Variables (Production). **You** set
these — they're your secrets:

| Var | Value |
|---|---|
| `DATABASE_URL` | the **pooled** target connection string |
| `AUTH_SECRET` | a fresh 32+ byte random secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client (add the prod redirect URI `https://<domain>/api/auth/callback/google`) |
| `STORAGE_ENDPOINT` / `STORAGE_REGION` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | S3-compatible storage creds |
| `NEXT_PUBLIC_STORAGE_BASE_URL` | public URL objects are served from |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` |
| `ADMIN_EMAILS` | comma-separated admin emails |
| `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` | carry over from current config |

The old `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` are no longer read
by the app and can be removed after cutover.

---

## Phase 6 — Deploy the new code

1. Merge **PR #1** (`migrate/...` → `main`).
2. Vercel builds `main` with the Production env vars from Phase 5 → the site now
   runs on Postgres.

---

## Phase 7 — Smoke test, then unfreeze

On production: log in (existing user keeps their password), browse listings, open
a listing, start a chat, post a listing, load `/account` and `/admin`. If green,
**lift the write freeze**. Watch error rates for the first 72h (hypercare, §3.3 of
`RISK_AND_ROLLBACK_PLAN.md`).

---

## Rollback

- **First hours (critical bug):** Vercel Instant Rollback to the previous
  Supabase build, restore old env vars, unpause Supabase, unfreeze. Writes made on
  the new stack since cutover are lost — keep the window short.
- **Days 1–14:** prefer fix-forward. Reverse migration is possible via the runbook
  in `RISK_AND_ROLLBACK_PLAN.md` if truly needed.
- Keep the **Supabase project paused, not deleted**, as the rollback anchor until
  you've had a clean stretch on Postgres.

---

## What's intentionally dropped at cutover

Supabase Auth audit log, refresh tokens (hence the forced re-login), in-flight
email OTPs, pending email-change states. Acceptable for this product; announce the
re-login.
