# `lib/db` — data-access layer (migration foundation)

> **Status: scaffolding only. Nothing here is wired into the running app.**
> Query & Buy still runs entirely on Supabase (`utils/supabase/*`). This
> directory is Phase 2 of the Supabase→self-managed-Postgres migration
> ([MIGRATION_BLUEPRINT.md](../../MIGRATION_BLUEPRINT.md),
> [MIGRATION_TASKS.md](../../MIGRATION_TASKS.md) Phase 2). It compiles and is
> type-checked, but no page, action, route, or component imports it yet.

## What lives here

| File | Role |
|---|---|
| `index.ts` | The Prisma 7 client singleton (node-postgres driver adapter, `DATABASE_URL`). Lazily constructed — importing it needs no database. |
| `viewer.ts` | `loadViewer(id, email)` — fetches `user_roles` and builds a [`Viewer`](../authz/viewer.ts). The seam Auth.js (Phase 3) plugs into. |
| `listings.ts` | Example Viewer-scoped repository, showing the pattern the Phase 4 rewrite of `lib/*/queries.ts` follows. |
| `system/` | Privileged, non-Viewer-scoped repositories — the app-level replacement for the `service_role` client (`utils/supabase/admin.ts`). |

## The boundary rule (this is the point of the whole layer)

Supabase enforced authorization in the database with RLS. The target has **no
RLS**, so scoping must be enforced in application code — and that is only
trustworthy if feature code *cannot* reach an unscoped client. Hence:

1. **`@/lib/db` / `@/lib/db/index` (raw client)** — importable only inside
   `lib/db/**`. Feature code imports a **repository** (`@/lib/db/listings`),
   never the client.
2. **`@/lib/db/system[/*]`** — importable only inside `lib/db/**` or the audited
   allowlist in [`system/index.ts`](system/index.ts) (the files that use the
   service-role client today).
3. **`@/lib/generated/prisma[/*]`** — importable only inside `lib/db/**` and
   `lib/authz/**`.

Enforced by [`scripts/check-db-boundaries.mjs`](../../scripts/check-db-boundaries.mjs)
(`npm run check:boundaries`) — a dependency-free stand-in for an ESLint
`no-restricted-imports` rule, since the repo lints with `tsc`. When/if ESLint is
adopted, the equivalent rule is:

```js
// eslint no-restricted-imports (future)
{ patterns: [
  { group: ['@/lib/db', '@/lib/db/index'], message: 'Import a repository, not the raw client.' },
  { group: ['@/lib/generated/prisma', '@/lib/generated/prisma/*'], message: 'Only lib/db and lib/authz may import the generated client.' },
]}
```

## Generated client

`lib/generated/` is git-ignored and reproduced by `prisma generate` (run
automatically via the `postinstall` script, so fresh clones / CI / Vercel builds
get it before type-checking). Regenerate manually after schema edits with
`npm run prisma:generate`.

## Why the client isn't active yet

Constructing `db` throws if `DATABASE_URL` is unset — but only on first query,
never at import. Since no runtime path imports `lib/db` yet, the live app is
unaffected whether or not `DATABASE_URL` exists. Wiring happens in Phase 4,
file-by-file, per [MIGRATION_TASKS.md](../../MIGRATION_TASKS.md) §4.
