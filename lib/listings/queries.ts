import { createClient } from '@/utils/supabase/server'

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
  'id, title_en, price_fils, currency, emirate, area, condition, seller_id, published_at, images:listing_images(storage_key, position)'

export type SortKey = 'newest' | 'price_asc' | 'price_desc'

export type ListingFilters = {
  q?: string
  categoryIds?: string[]
  emirate?: string
  condition?: string
  minFils?: number
  maxFils?: number
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
  if (q) query = query.textSearch('search_vector', q, { type: 'websearch', config: 'simple' })
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('category_id', filters.categoryIds)
  }
  if (filters.emirate) query = query.eq('emirate', filters.emirate)
  if (filters.condition) query = query.eq('condition', filters.condition)
  if (typeof filters.minFils === 'number') query = query.gte('price_fils', filters.minFils)
  if (typeof filters.maxFils === 'number') query = query.lte('price_fils', filters.maxFils)

  if (filters.sort === 'price_asc') query = query.order('price_fils', { ascending: true })
  else if (filters.sort === 'price_desc') query = query.order('price_fils', { ascending: false })
  else query = query.order('published_at', { ascending: false, nullsFirst: false })

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
    seller: sellers.get(r.seller_id) ?? null,
  }
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
      'id, title_en, price_fils, currency, status, view_count, created_at, images:listing_images(storage_key, position)',
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
    images: RawImage[] | null
  }>

  return rows.map((r) => ({
    id: r.id,
    title_en: r.title_en,
    price_fils: r.price_fils,
    currency: r.currency,
    status: r.status,
    view_count: r.view_count,
    created_at: r.created_at,
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
