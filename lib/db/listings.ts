/**
 * lib/db/listings — example Viewer-scoped repository (MIGRATION FOUNDATION,
 * not yet in runtime use).
 * ===========================================================================
 * A representative slice of the Phase 4 repository layer, included now to (a)
 * demonstrate the pattern every query module will follow and (b) type-check the
 * lib/authz/policies fragments against real Prisma call sites. The full rewrite
 * of lib/listings/queries.ts happens in Phase 4 (MIGRATION_TASKS.md §4a).
 *
 * The rule this encodes — and that RLS used to enforce in the database — is
 * that a listing read is ALWAYS composed with listingVisibleWhere(viewer). A
 * caller cannot forget the scope, because the raw client is not reachable from
 * feature code (see lib/db/README.md).
 */
import { db } from '@/lib/db'
import { listingVisibleWhere } from '@/lib/authz/policies'
import type { Viewer } from '@/lib/authz/viewer'
import type { Prisma } from '@/lib/generated/prisma/client'

/** List listings visible to `viewer` (anonymous → active, non-deleted only). */
export async function listVisibleListings(
  viewer: Viewer | null,
  opts: { where?: Prisma.ListingWhereInput; take?: number; skip?: number } = {},
) {
  const { where, take = 24, skip = 0 } = opts
  return db.listing.findMany({
    where: { AND: [listingVisibleWhere(viewer), where ?? {}] },
    orderBy: { publishedAt: 'desc' },
    take,
    skip,
  })
}

/** Fetch one listing by id, but only if `viewer` is allowed to see it. */
export async function getVisibleListing(viewer: Viewer | null, id: string) {
  return db.listing.findFirst({
    where: { AND: [{ id }, listingVisibleWhere(viewer)] },
  })
}
