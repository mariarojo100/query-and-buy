# `lib/authz` — application-level authorization (migration foundation)

> **Status: scaffolding only, not wired into the running app.** Part of Phase 2
> of the Supabase→self-managed migration. Pure code (types + functions), no I/O,
> no database, no session library — safe to import anywhere and trivial to unit
> test.

Supabase enforced authorization with Postgres RLS keyed on `auth.uid()` plus the
`is_staff()` / `is_admin()` SQL helpers. The target stack has no RLS, so the same
rules move into application code, expressed against a **`Viewer`**.

| File | Role |
|---|---|
| `viewer.ts` | The `Viewer` type and `deriveViewer()` — the single place `isStaff`/`isAdmin` are decided. Ports `is_staff()`, `is_admin()`, and the `ADMIN_EMAILS` env gate ([lib/admin/gate.ts](../admin/gate.ts), left untouched). |
| `policies.ts` | Each RLS **read** policy re-expressed as a reusable, typed Prisma `where` fragment (`listingVisibleWhere`, `conversationVisibleWhere`, …). One function per policy, cross-referenced to its migration, so the RLS→app-authz translation is auditable. |

Write-side rules (e.g. "sender must equal viewer", "order must be completed
before a review") are **transaction-time assertions inside repositories**, not
`where` fragments, and so are not modeled here — they arrive with the Phase 4
repositories. The full policy catalogue is
[MIGRATION_BLUEPRINT.md](../../MIGRATION_BLUEPRINT.md) §5.

Consumed by the repositories in [`lib/db`](../db/README.md); the `Viewer`'s
identity source (Auth.js session) is built in Phase 3.
