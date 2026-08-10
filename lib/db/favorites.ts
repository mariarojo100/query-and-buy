/**
 * lib/db/favorites — Viewer-scoped favorites repository (Phase 4).
 * ===========================================================================
 * Replaces the Supabase `fav_owner_all` RLS policy with explicit `userId =
 * viewer.id` scoping. Repository functions take an explicit Viewer so they are
 * directly unit-testable (tests/authz/favorites.test.ts). The public entry
 * points (lib/favorites/queries.ts, app/favorites/actions.ts) resolve the
 * viewer from the session and delegate here.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'
import type { FeedListing, SellerMini } from '@/lib/listings/queries'
import { toAttrMap } from '@/lib/db/listings'

/** Which of `listingIds` this viewer has favorited (RLS: fav_owner_all). */
export async function favoritedIdsFor(viewer: Viewer, listingIds: string[]): Promise<Set<string>> {
  const set = new Set<string>()
  if (listingIds.length === 0) return set
  const rows = await db.favorite.findMany({
    where: { userId: viewer.id, listingId: { in: listingIds } },
    select: { listingId: true },
  })
  for (const r of rows) set.add(r.listingId)
  return set
}

/** The viewer's favorited listings that are still active, newest-saved first. */
export async function favoritesFeedFor(viewer: Viewer): Promise<FeedListing[]> {
  const rows = await db.favorite.findMany({
    where: { userId: viewer.id, listing: { status: 'active', deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      listing: {
        select: {
          id: true,
          publicId: true,
          titleEn: true,
          priceFils: true,
          currency: true,
          emirate: true,
          area: true,
          condition: true,
          publishedAt: true,
          isFeatured: true,
          viewCount: true,
          attributes: true,
          category: { select: { slug: true } },
          images: { select: { storageKey: true }, orderBy: { position: 'asc' }, take: 1 },
          seller: {
            select: {
              profile: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  badgeLevel: true,
                  emailVerified: true,
                },
              },
            },
          },
        },
      },
    },
  })

  const out: FeedListing[] = []
  for (const r of rows) {
    const l = r.listing
    if (!l) continue
    const p = l.seller.profile
    const seller: SellerMini | null = p
      ? {
          id: p.id,
          username: p.username,
          display_name: p.displayName,
          avatar_url: p.avatarUrl,
          badge_level: p.badgeLevel,
          email_verified: p.emailVerified,
        }
      : null
    out.push({
      id: l.id,
      public_id: l.publicId,
      title_en: l.titleEn,
      price_fils: Number(l.priceFils),
      currency: l.currency,
      emirate: l.emirate,
      area: l.area,
      condition: l.condition,
      cover_key: l.images[0]?.storageKey ?? null,
      published_at: l.publishedAt ? l.publishedAt.toISOString() : null,
      is_featured: l.isFeatured,
      view_count: l.viewCount ?? 0,
      attributes: toAttrMap(l.attributes),
      category_slug: l.category?.slug ?? null,
      seller,
    })
  }
  return out
}

/** Toggle a favorite; returns the resulting state. Always scoped to the viewer. */
export async function toggleFavoriteFor(viewer: Viewer, listingId: string): Promise<{ favorited: boolean }> {
  const key = { userId_listingId: { userId: viewer.id, listingId } }
  const existing = await db.favorite.findUnique({ where: key, select: { userId: true } })
  if (existing) {
    await db.favorite.delete({ where: key })
    return { favorited: false }
  }
  await db.favorite.create({ data: { userId: viewer.id, listingId } })
  return { favorited: true }
}
