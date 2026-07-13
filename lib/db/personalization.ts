/**
 * lib/db/personalization — owner-scoped listing_views reads (Phase 4).
 * Replaces listing_views_owner_all RLS. Higher-level recommendation shaping
 * lives in lib/personalization/queries.ts, which delegates listing lookups to
 * the already-migrated listings repository.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'

/** Listing ids the viewer recently opened, most recent first. */
export async function recentlyViewedIdsFor(viewer: Viewer, limit: number): Promise<string[]> {
  const rows = await db.listingView.findMany({
    where: { userId: viewer.id },
    orderBy: { viewedAt: 'desc' },
    take: limit,
    select: { listingId: true },
  })
  return rows.map((r) => r.listingId)
}

/** Candidate recommendation ids: active listings in recently-viewed categories, excluding own + already seen. */
export async function recommendedIdsFor(viewer: Viewer, limit: number): Promise<string[]> {
  const viewedRows = await db.listingView.findMany({
    where: { userId: viewer.id },
    orderBy: { viewedAt: 'desc' },
    take: 20,
    select: { listingId: true },
  })
  const viewedIds = viewedRows.map((r) => r.listingId)
  if (!viewedIds.length) return []

  const viewed = await db.listing.findMany({ where: { id: { in: viewedIds } }, select: { categoryId: true } })
  const catIds = [...new Set(viewed.map((l) => l.categoryId))]
  if (!catIds.length) return []

  const recs = await db.listing.findMany({
    where: { categoryId: { in: catIds }, status: 'active', deletedAt: null },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    take: limit + viewedIds.length + 5,
    select: { id: true, sellerId: true },
  })
  return recs
    .filter((r) => r.sellerId !== viewer.id && !viewedIds.includes(r.id))
    .map((r) => r.id)
    .slice(0, limit)
}
