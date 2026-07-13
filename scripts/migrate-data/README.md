# Data migration — Supabase → self-managed PostgreSQL

Scripts for the cutover data move (MIGRATION_BLUEPRINT.md §7). Because
`public.users.id` already equals `auth.users.id`, **all IDs are preserved** and
every foreign key survives — this is a copy, not a transform.

## Files

| File | Role |
|---|---|
| `run.sh` | End-to-end runbook: apply baseline → dump/load public data → migrate auth → rewrite avatars → verify. |
| `migrate-auth.ts` | Source `auth.users`/`auth.identities` → target `auth_credentials`/`auth_accounts` + verified flags + status. Idempotent. |
| `rewrite-avatar-urls.ts` | Repoint `profiles.avatar_url` from the Supabase host to the target storage host. |
| `verify.ts` | Reconcile source↔target: per-table counts + id checksums, credential-hash fidelity, google-account count, no stale avatar URLs. |
| `01-export-auth.sql` | Reference SELECTs for the auth data (what `migrate-auth.ts` reads) — for manual inspection / CSV export if preferred. |

## Order & why

1. **Baseline schema** onto the target (`db/baseline/*`). Do **not** run
   `db/seed.sql` — categories and `marketplace_settings` arrive with their real
   ids in the data dump; seeding first would collide.
2. **Public data** via `pg_dump --data-only --disable-triggers` → load. Disabling
   triggers stops the counter triggers (`trg_listings_count`, etc.) from
   double-firing during load; the denormalized values come over already-correct.
   The generated `search_vector` column is skipped automatically; PostGIS
   `location` and the pgvector `embedding` load as-is (target has both extensions).
3. **Auth** (`migrate-auth.ts`): bcrypt hashes copy verbatim, so migrated users
   keep their passwords; Google identities become linkable `auth_accounts`;
   email/phone confirmation → the `has_*_verified` / `*_verified` flags.
4. **Avatar URLs** (`rewrite-avatar-urls.ts`): only `profiles.avatar_url` stores a
   full URL; `listing_images.storage_key` stores keys and needs nothing.
5. **Verify** (`verify.ts`): gate the unfreeze on a clean result.

## Storage objects

Not handled here (they are blobs, not rows). Supabase Storage exposes an
S3-compatible endpoint, so copy both buckets with rclone:

```
rclone sync supabase-s3:avatars        r2:avatars        --checksum
rclone sync supabase-s3:listing-images r2:listing-images --checksum
```

Do a full sync days ahead; run a final incremental sync inside the freeze so the
delta is tiny. Verify with `rclone check`.

## Running

Set env, then:

```
SOURCE_DATABASE_URL=postgres://...supabase...  \
TARGET_DATABASE_URL=postgres://...target...    \
SOURCE_SUPABASE_URL=https://<ref>.supabase.co  \
NEXT_PUBLIC_STORAGE_BASE_URL=https://cdn.example \
bash scripts/migrate-data/run.sh
```

Deliberately dropped at cutover (acceptable for this product): the Supabase Auth
audit log, refresh tokens (all sessions require re-login once), in-flight email
OTPs, and pending email-change states. Announce the re-login beforehand.

## Dry run

The whole pipeline has been rehearsed against a local mock source → target on a
scratch Postgres (see the migration session notes): counts + checksums match, a
seeded bcrypt password verifies through `lib/auth` after migration, a Google
identity lands in `auth_accounts`, verified flags propagate, and avatar hosts are
rewritten with zero Supabase URLs left. Re-run twice against staging before the
real cutover (idempotency check).
