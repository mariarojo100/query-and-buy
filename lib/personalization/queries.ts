import { createClient } from '@/utils/supabase/server'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('listing_views')
    .select('listing_id')
    .order('viewed_at', { ascending: false })
    .limit(limit)
  const ids = ((data ?? []) as { listing_id: string }[]).map((r) => r.listing_id)
  return getListingsByIds(ids)
}

/** Active listings in categories the user recently viewed (excludes own + seen). */
export async function getRecommended(limit = 8): Promise<FeedListing[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: views } = await supabase
    .from('listing_views')
    .select('listing_id')
    .order('viewed_at', { ascending: false })
    .limit(20)
  const viewedIds = ((views ?? []) as { listing_id: string }[]).map((r) => r.listing_id)
  if (viewedIds.length === 0) return []

  const { data: viewed } = await supabase
    .from('listings')
    .select('id, category_id')
    .in('id', viewedIds)
  const catIds = [
    ...new Set(
      ((viewed ?? []) as { category_id: string | null }[])
        .map((l) => l.category_id)
        .filter((c): c is string => !!c),
    ),
  ]
  if (catIds.length === 0) return []

  const { data: recs } = await supabase
    .from('listings')
    .select('id, seller_id')
    .in('category_id', catIds)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit + viewedIds.length + 5)
  const recIds = ((recs ?? []) as { id: string; seller_id: string }[])
    .filter((r) => r.seller_id !== user.id && !viewedIds.includes(r.id))
    .map((r) => r.id)
    .slice(0, limit)
  return getListingsByIds(recIds)
}

export type ContinueItem = OrderListItem & { role: 'buyer' | 'seller' }

/** In-progress negotiations (active orders) for the user, newest first. */
export async function getContinueNegotiation(limit = 6): Promise<ContinueItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

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
