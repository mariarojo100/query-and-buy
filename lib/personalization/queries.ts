import { getViewer } from '@/lib/auth/session'
import { recentlyViewedIdsFor, recommendedIdsFor } from '@/lib/db/personalization'
import {
  getCategoryBySlug,
  getFilteredListings,
  getListingsByIds,
  type FeedListing,
} from '@/lib/listings/queries'
import { aedToFils } from '@/lib/format'
import { getBuyerOrders, getSellerOrders, type OrderListItem } from '@/lib/orders/queries'
import { getUserSavedSearches } from '@/lib/savedSearches/queries'
import { describeSearch } from '@/lib/savedSearches/filters'

const ACTIVE_ORDER_STATES = ['negotiating', 'offer_sent', 'offer_accepted', 'awaiting_confirmation']

/** Listings the signed-in user recently opened, most recent first. */
export async function getRecentlyViewed(limit = 8): Promise<FeedListing[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return getListingsByIds(await recentlyViewedIdsFor(viewer, limit))
}

/** Active listings in categories the user recently viewed (excludes own + seen). */
export async function getRecommended(limit = 8): Promise<FeedListing[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return getListingsByIds(await recommendedIdsFor(viewer, limit))
}

export type ContinueItem = OrderListItem & { role: 'buyer' | 'seller' }

/** In-progress negotiations (active orders) for the user, newest first. */
export async function getContinueNegotiation(limit = 6): Promise<ContinueItem[]> {
  const viewer = await getViewer()
  if (!viewer) return []

  const [buyer, seller] = await Promise.all([getBuyerOrders(), getSellerOrders()])
  const tagged: ContinueItem[] = [
    ...buyer.map((o) => ({ ...o, role: 'buyer' as const })),
    ...seller.map((o) => ({ ...o, role: 'seller' as const })),
  ].filter((o) => ACTIVE_ORDER_STATES.includes(o.status))

  tagged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return tagged.slice(0, limit)
}

/** New listings matching the user's most recent saved search. */
export async function getSavedSearchMatches(
  limit = 8,
): Promise<{ label: string; listings: FeedListing[] } | null> {
  const searches = await getUserSavedSearches()
  if (searches.length === 0) return null
  const s = searches[0]
  const f = s.parsed_filters

  let categoryIds: string[] | undefined
  if (f.category) {
    const cat = await getCategoryBySlug(f.category)
    categoryIds = cat?.ids
  }
  const { listings } = await getFilteredListings({
    q: s.query_text ?? undefined,
    categoryIds,
    emirate: f.emirate,
    condition: f.condition,
    minFils: f.min ? (aedToFils(f.min) ?? undefined) : undefined,
    maxFils: f.max ? (aedToFils(f.max) ?? undefined) : undefined,
    sort: 'newest',
    limit,
  })
  if (listings.length === 0) return null
  return { label: s.label || describeSearch(s.query_text, f).join(' · '), listings }
}
