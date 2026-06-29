import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

export type SellerMini = {
  id: string
  username: string | null
  display_name: string
  avatar_url: string | null
  badge_level: string
  email_verified: boolean
}

export type FeedListing = {
  id: string
  title_en: string
  price_fils: number
  currency: string
  emirate: string | null
  area: string | null
  condition: string
  cover_key: string | null
  published_at: string | null
  is_featured: boolean
  view_count: number
  seller: SellerMini | null
}

export type ListingDetail = {
  id: string
  title_en: string
  description: string
  price_fils: number
  currency: string
  is_negotiable: boolean
  condition: string
  status: string
  emirate: string | null
  area: string | null
  category_name: string | null
  published_at: string | null
  created_at: string
  seller_id: string
  images: { storage_key: string; position: number }[]
  seller:
    | (SellerMini & {
        member_since: string
        listings_count: number
        bio: string | null
        emirate: string | null
        email_verified: boolean
        phone_verified: boolean
        reports_count: number
      })
    | null
}

export type MyListing = {
  id: string
  title_en: string
  price_fils: number
  currency: string
  status: string
  view_count: number
  created_at: string
  cover_key: string | null
  emirate: string | null
  area: string | null
  is_featured: boolean
  favorites_count: number
}

export type EditListing = {
  id: string
  title_en: string
  description: string
  price_fils: number
  is_negotiable: boolean
  condition: string
  category_id: string
  emirate: string | null
  area: string | null
  status: string
  images: { storage_key: string; position: number }[]
}

type RawImage = { storage_key: string; position: number }

function coverKey(images: RawImage[] | null | undefined): string | null {
  if (!images?.length) return null
  return [...images].sort((a, b) => a.position - b.position)[0].storage_key
}

/** Fetch sellers' public profiles for a set of user ids → keyed map. */
async function sellerMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, SellerMini>> {
  const map = new Map<string, SellerMini>()
  if (ids.length === 0) return map
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, badge_level, email_verified')
    .in('id', ids)
  for (const row of (data ?? []) as SellerMini[]) map.set(row.id, row)
  return map
}

const FEED_SELECT =
  'id, title_en, price_fils, currency, emirate, area, condition, seller_id, published_at, is_featured, view_count, images:listing_images(storage_key, position)'

export type SortKey =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'most_viewed'
  | 'recently_updated'
  | 'featured_first'

export type ListingFilters = {
  q?: string
  categoryIds?: string[]
  emirate?: string
  condition?: string
  minFils?: number
  maxFils?: number
  negotiable?: boolean
  featured?: boolean
  /** Only listings published within the last N days. */
  sinceDays?: number
  sort?: SortKey
  limit?: number
}

type RawFeedRow = {
  id: string
  title_en: string
  price_fils: number
  currency: string
  emirate: string | null
  area: string | null
  condition: string
  seller_id: string
  published_at: string | null
  is_featured: boolean
  view_count: number
  images: RawImage[] | null
}

/**
 * Filtered + sorted active listings, used by the homepage and category pages.
 * Search uses the generated `search_vector` (title + description FTS, GIN-indexed).
 */
export async function getFilteredListings(
  filters: ListingFilters = {},
): Promise<{ listings: FeedListing[]; count: number }> {
  const supabase = await createClient()
  const limit = filters.limit ?? 48

  let query = supabase
    .from('listings')
    .select(FEED_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .is('deleted_at', null)

  const q = filters.q?.trim()
  if (q) {
    // Full-text search matches whole tokens only (config 'simple' = no stemming),
    // so "phone" would miss "iPhone"/"Smartphone". Combine websearch FTS with a
    // substring ILIKE on title + description so partial/generic terms still match.
    const safe = q.replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()
    if (safe) {
      const like = `*${safe}*`
      query = query.or(
        `search_vector.wfts(simple).${safe},title_en.ilike.${like},description.ilike.${like}`,
      )
    }
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('category_id', filters.categoryIds)
  }
  if (filters.emirate) query = query.eq('emirate', filters.emirate)
  if (filters.condition) query = query.eq('condition', filters.condition)
  if (typeof filters.minFils === 'number') query = query.gte('price_fils', filters.minFils)
  if (typeof filters.maxFils === 'number') query = query.lte('price_fils', filters.maxFils)
  if (filters.negotiable) query = query.eq('is_negotiable', true)
  if (filters.featured) query = query.eq('is_featured', true)
  if (filters.sinceDays && filters.sinceDays > 0) {
    const since = new Date(Date.now() - filters.sinceDays * 86_400_000).toISOString()
    query = query.gte('published_at', since)
  }

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price_fils', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_fils', { ascending: false })
      break
    case 'oldest':
      query = query.order('published_at', { ascending: true, nullsFirst: false })
      break
    case 'most_viewed':
      query = query.order('view_count', { ascending: false })
      break
    case 'recently_updated':
      query = query.order('updated_at', { ascending: false })
      break
    case 'featured_first':
      query = query
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('published_at', { ascending: false, nullsFirst: false })
  }

  const { data, count } = await query.limit(limit)
  const rows = (data ?? []) as RawFeedRow[]
  const sellers = await sellerMap(supabase, [...new Set(rows.map((r) => r.seller_id))])

  const listings = rows.map((r) => toFeedListing(r, sellers))
  return { listings, count: count ?? listings.length }
}

function toFeedListing(r: RawFeedRow, sellers: Map<string, SellerMini>): FeedListing {
  return {
    id: r.id,
    title_en: r.title_en,
    price_fils: r.price_fils,
    currency: r.currency,
    emirate: r.emirate,
    area: r.area,
    condition: r.condition,
    cover_key: coverKey(r.images),
    published_at: r.published_at,
    is_featured: r.is_featured,
    view_count: r.view_count ?? 0,
    seller: sellers.get(r.seller_id) ?? null,
  }
}

/** Currently-featured active listings for the homepage (admin-curated). */
export async function getFeaturedListings(limit = 8): Promise<FeedListing[]> {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()
  const { data } = await supabase
    .from('listings')
    .select(FEED_SELECT)
    .eq('status', 'active')
    .is('deleted_at', null)
    .eq('is_featured', true)
    .or(`featured_until.is.null,featured_until.gt.${nowIso}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  const rows = (data ?? []) as RawFeedRow[]
  const sellers = await sellerMap(supabase, [...new Set(rows.map((r) => r.seller_id))])
  return rows.map((r) => toFeedListing(r, sellers))
}

/** Active listings by id, preserving the input order (recently viewed, recs). */
export async function getListingsByIds(ids: string[]): Promise<FeedListing[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select(FEED_SELECT)
    .in('id', ids)
    .eq('status', 'active')
    .is('deleted_at', null)
  const rows = (data ?? []) as RawFeedRow[]
  const sellers = await sellerMap(supabase, [...new Set(rows.map((r) => r.seller_id))])
  const byId = new Map(rows.map((r) => [r.id, toFeedListing(r, sellers)]))
  return ids.map((id) => byId.get(id)).filter((l): l is FeedListing => !!l)
}

/**
 * "You may also like" — active listings similar to one listing: same category,
 * a nearby price band, ranked to prefer the same emirate. Never the current one.
 */
export async function getSimilarListings(listingId: string, limit = 8): Promise<FeedListing[]> {
  const supabase = await createClient()
  const { data: base } = await supabase
    .from('listings')
    .select('category_id, price_fils, emirate')
    .eq('id', listingId)
    .maybeSingle()
  if (!base) return []
  const b = base as { category_id: string | null; price_fils: number; emirate: string | null }

  const lo = Math.round(b.price_fils * 0.4)
  const hi = Math.round(b.price_fils * 1.6)

  let q = supabase
    .from('listings')
    .select(FEED_SELECT)
    .eq('status', 'active')
    .is('deleted_at', null)
    .neq('id', listingId)
    .gte('price_fils', lo)
    .lte('price_fils', hi)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit * 3)
  if (b.category_id) q = q.eq('category_id', b.category_id)

  const rows = new Map<string, RawFeedRow>()
  for (const r of ((await q).data ?? []) as RawFeedRow[]) rows.set(r.id, r)

  // Broaden to the whole category if the price band was too narrow.
  if (rows.size < limit && b.category_id) {
    const { data: more } = await supabase
      .from('listings')
      .select(FEED_SELECT)
      .eq('status', 'active')
      .is('deleted_at', null)
      .neq('id', listingId)
      .eq('category_id', b.category_id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit * 2)
    for (const r of (more ?? []) as RawFeedRow[]) if (!rows.has(r.id)) rows.set(r.id, r)
  }

  const ranked = [...rows.values()]
    .sort((a, c) => (c.emirate === b.emirate ? 1 : 0) - (a.emirate === b.emirate ? 1 : 0))
    .slice(0, limit)
  const sellers = await sellerMap(supabase, [...new Set(ranked.map((r) => r.seller_id))])
  return ranked.map((r) => toFeedListing(r, sellers))
}

/** A seller's active listings (for profile grids and "more from this seller"). */
export async function getSellerListings(
  sellerId: string,
  opts?: { excludeId?: string; limit?: number },
): Promise<FeedListing[]> {
  const supabase = await createClient()
  let query = supabase
    .from('listings')
    .select(FEED_SELECT)
    .eq('status', 'active')
    .is('deleted_at', null)
    .eq('seller_id', sellerId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(opts?.limit ?? 12)
  if (opts?.excludeId) query = query.neq('id', opts.excludeId)

  const { data } = await query
  const rows = (data ?? []) as RawFeedRow[]
  const sellers = await sellerMap(supabase, [...new Set(rows.map((r) => r.seller_id))])
  return rows.map((r) => toFeedListing(r, sellers))
}

export type CategoryLite = {
  id: string
  slug: string
  name_en: string
  parent_id: string | null
  position: number
}

/** All active categories — for the filter dropdown and category chips. */
export async function getActiveCategories(): Promise<CategoryLite[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, slug, name_en, parent_id, position')
    .eq('is_active', true)
    .order('position', { ascending: true })
  return (data ?? []) as CategoryLite[]
}

/** Active-listing counts rolled up to each top-level category slug. */
export async function getCategoryCounts(categories: CategoryLite[]): Promise<Map<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select('category_id')
    .eq('status', 'active')
    .is('deleted_at', null)

  const byId = new Map(categories.map((c) => [c.id, c]))
  const topSlug = (catId: string): string | null => {
    let c = byId.get(catId)
    if (!c) return null
    let guard = 0
    while (c.parent_id && guard++ < 6) {
      const parent = byId.get(c.parent_id)
      if (!parent) break
      c = parent
    }
    return c.slug
  }

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as { category_id: string }[]) {
    const slug = topSlug(row.category_id)
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return counts
}

/** Resolve a category slug → the category + its (one-level) child ids for filtering. */
export async function getCategoryBySlug(
  slug: string,
): Promise<{ category: CategoryLite; ids: string[] } | null> {
  const supabase = await createClient()
  const { data: cat } = await supabase
    .from('categories')
    .select('id, slug, name_en, parent_id, position')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (!cat) return null
  const category = cat as CategoryLite

  const { data: kids } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', category.id)
    .eq('is_active', true)
  const ids = [category.id, ...((kids ?? []) as { id: string }[]).map((k) => k.id)]
  return { category, ids }
}

/** All of the current user's listings (excludes soft-deleted), newest first. */
export async function getMyListings(): Promise<MyListing[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('listings')
    .select(
      'id, title_en, price_fils, currency, status, view_count, created_at, emirate, area, is_featured, images:listing_images(storage_key, position)',
    )
    .eq('seller_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as Array<{
    id: string
    title_en: string
    price_fils: number
    currency: string
    status: string
    view_count: number
    created_at: string
    emirate: string | null
    area: string | null
    is_featured: boolean
    images: RawImage[] | null
  }>

  // Favorite counts across all users need the service client (favorites RLS is
  // owner-only). Best-effort — falls back to 0 if the service role isn't set.
  const favCounts = new Map<string, number>()
  if (rows.length) {
    try {
      const admin = createServiceClient()
      const { data: favs } = await admin
        .from('favorites')
        .select('listing_id')
        .in(
          'listing_id',
          rows.map((r) => r.id),
        )
      for (const f of (favs ?? []) as { listing_id: string }[])
        favCounts.set(f.listing_id, (favCounts.get(f.listing_id) ?? 0) + 1)
    } catch {
      /* no service role → counts stay 0 */
    }
  }

  return rows.map((r) => ({
    id: r.id,
    title_en: r.title_en,
    price_fils: r.price_fils,
    currency: r.currency,
    status: r.status,
    view_count: r.view_count,
    created_at: r.created_at,
    emirate: r.emirate,
    area: r.area,
    is_featured: r.is_featured,
    favorites_count: favCounts.get(r.id) ?? 0,
    cover_key: coverKey(r.images),
  }))
}

/** Fetch a listing for editing — owner only (returns null otherwise). */
export async function getListingForEdit(id: string): Promise<EditListing | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('listings')
    .select(
      'id, seller_id, title_en, description, price_fils, is_negotiable, condition, category_id, emirate, area, status, images:listing_images(storage_key, position)',
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) return null
  const row = data as {
    id: string
    seller_id: string
    title_en: string
    description: string
    price_fils: number
    is_negotiable: boolean
    condition: string
    category_id: string
    emirate: string | null
    area: string | null
    status: string
    images: RawImage[] | null
  }
  if (row.seller_id !== user.id) return null // owner-only

  return {
    id: row.id,
    title_en: row.title_en,
    description: row.description,
    price_fils: row.price_fils,
    is_negotiable: row.is_negotiable,
    condition: row.condition,
    category_id: row.category_id,
    emirate: row.emirate,
    area: row.area,
    status: row.status,
    images: [...(row.images ?? [])].sort((a, b) => a.position - b.position),
  }
}

/** Single listing for the detail page. Returns null if not visible/found. */
export async function getListingById(id: string): Promise<ListingDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select(
      'id, title_en, description, price_fils, currency, is_negotiable, condition, status, emirate, area, published_at, created_at, seller_id, category:categories(name_en), images:listing_images(storage_key, position)',
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) return null
  const row = data as {
    id: string
    title_en: string
    description: string
    price_fils: number
    currency: string
    is_negotiable: boolean
    condition: string
    status: string
    emirate: string | null
    area: string | null
    published_at: string | null
    created_at: string
    seller_id: string
    category: { name_en: string } | { name_en: string }[] | null
    images: RawImage[] | null
  }

  const { data: sellerRow } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, badge_level, bio, emirate, member_since, listings_count, email_verified, phone_verified, reports_count',
    )
    .eq('id', row.seller_id)
    .maybeSingle()

  const category = Array.isArray(row.category) ? row.category[0] : row.category

  return {
    id: row.id,
    title_en: row.title_en,
    description: row.description,
    price_fils: row.price_fils,
    currency: row.currency,
    is_negotiable: row.is_negotiable,
    condition: row.condition,
    status: row.status,
    emirate: row.emirate,
    area: row.area,
    category_name: category?.name_en ?? null,
    published_at: row.published_at,
    created_at: row.created_at,
    seller_id: row.seller_id,
    images: [...(row.images ?? [])].sort((a, b) => a.position - b.position),
    seller: (sellerRow as ListingDetail['seller']) ?? null,
  }
}
