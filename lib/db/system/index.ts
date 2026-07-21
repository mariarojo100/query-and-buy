/**
 * lib/db/system — privileged, non-Viewer-scoped repositories.
 * ===========================================================================
 * The deliberate, audited places that read or write across users, bypassing the
 * per-Viewer scoping that lib/authz policies enforce everywhere else. (These
 * replaced the former service-role admin client that the app used before the
 * move to self-managed Postgres.)
 *
 * There is no `service_role` in self-managed Postgres and no RLS to bypass;
 * "system" is purely an application concept. What keeps it honest is the import
 * boundary (scripts/check-db-boundaries.mjs): modules here may be imported ONLY
 * from the allowlisted call sites that legitimately need cross-user access —
 * the files that perform privileged cross-user reads/writes:
 *
 *   app/admin/actions.ts, lib/admin/queries.ts, app/orders/actions.ts
 *   (cross-user order/listing transitions + contact reveal),
 *   lib/notifications/dispatch.ts, lib/reputation/queries.ts,
 *   lib/reviews/queries.ts, lib/listings/queries.ts (cross-user counts),
 *   lib/search/intelligence.ts, lib/email/send.ts, lib/safety/moderation-log.ts,
 *   app/listing/actions.ts, app/account/page.ts.
 *
 * Repositories (notificationsRepo, ordersSystemRepo, reputationRepo, …) land
 * here in Phase 4. This file is the folder's index and currently exports
 * nothing.
 */
export {}
