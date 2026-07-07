/**
 * lib/db/activity — profile activity feed data (Phase 4).
 * ===========================================================================
 * Listings are gated by listingVisibleWhere(viewer) and completed sales by the
 * order-participant rule, so the feed shows exactly what the old RLS showed: a
 * visitor sees the profile owner's ACTIVE listings only (and no private sales),
 * while the owner viewing their own profile also sees drafts + their sales.
 */
import { db } from '@/lib/db'
import { listingVisibleWhere } from '@/lib/authz/policies'
import type { Viewer } from '@/lib/authz/viewer'

export type ActivityData = {
  listings: { id: string; titleEn: string; createdAt: Date; isFeatured: boolean }[]
  sales: { id: string; completedAt: Date | null; listingTitle: string | null }[]
}

export async function activityDataFor(viewer: Viewer | null, userId: string): Promise<ActivityData> {
  const [listings, orders] = await Promise.all([
    db.listing.findMany({
      where: { AND: [{ sellerId: userId, deletedAt: null }, listingVisibleWhere(viewer)] },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { id: true, titleEn: true, createdAt: true, isFeatured: true },
    }),
    viewer
      ? db.order.findMany({
          where: { sellerId: userId, status: 'completed', OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] },
          orderBy: { completedAt: 'desc' },
          take: 10,
          select: { id: true, completedAt: true, listing: { select: { titleEn: true } } },
        })
      : Promise.resolve([]),
  ])
  return {
    listings,
    sales: orders.map((o) => ({ id: o.id, completedAt: o.completedAt, listingTitle: o.listing?.titleEn ?? null })),
  }
}
