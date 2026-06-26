import { createServiceClient } from '@/utils/supabase/admin'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'

type Admin = ReturnType<typeof createServiceClient>

function admin(): Admin {
  return createServiceClient()
}

function startOfTodayISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function count(db: Admin, table: string, apply?: (q: any) => any): Promise<number> {
  let q: any = db.from(table).select('id', { count: 'exact', head: true })
  if (apply) q = apply(q)
  const { count: c } = await q
  return c ?? 0
}

/* ----------------------------- dashboard ----------------------------- */
export type DashboardStats = {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  listings: number
  activeListings: number
  reservedListings: number
  soldListings: number
  pendingModeration: number
  messagesToday: number
  offers: number
  ordersConfirmed: number
  reviews: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = admin()
  const today = startOfTodayISO()
  const [
    totalUsers,
    activeUsers,
    newUsersToday,
    listings,
    activeListings,
    reservedListings,
    soldListings,
    pendingModeration,
    messagesToday,
    offers,
    ordersConfirmed,
    reviews,
  ] = await Promise.all([
    count(db, 'profiles'),
    count(db, 'users', (q) => q.eq('status', 'active')),
    count(db, 'profiles', (q) => q.gte('member_since', today)),
    count(db, 'listings'),
    count(db, 'listings', (q) => q.eq('status', 'active')),
    count(db, 'listings', (q) => q.eq('status', 'reserved')),
    count(db, 'listings', (q) => q.eq('status', 'sold')),
    count(db, 'listings', (q) => q.eq('status', 'pending_review')),
    count(db, 'messages', (q) => q.gte('created_at', today)),
    count(db, 'offers'),
    count(db, 'orders', (q) => q.in('status', ['confirmed', 'completed'])),
    count(db, 'reviews'),
  ])
  return {
    totalUsers,
    activeUsers,
    newUsersToday,
    listings,
    activeListings,
    reservedListings,
    soldListings,
    pendingModeration,
    messagesToday,
    offers,
    ordersConfirmed,
    reviews,
  }
}

/* ----------------------------- listings ----------------------------- */
export type AdminListing = {
  id: string
  title_en: string
  status: string
  price_fils: number
  currency: string
  created_at: string
  is_featured: boolean
  category_id: string | null
  sellerName: string
  cover: string | null
}

export type ListingFilters = {
  q?: string
  status?: string
  categoryId?: string
  sellerId?: string
  since?: string
  featured?: boolean
  page?: number
}

export const PAGE_SIZE = 25

export async function listListings(
  f: ListingFilters,
): Promise<{ rows: AdminListing[]; total: number }> {
  const db = admin()
  const page = Math.max(0, f.page ?? 0)
  let q = db
    .from('listings')
    .select(
      'id, title_en, status, price_fils, currency, created_at, is_featured, category_id, seller_id, images:listing_images(storage_key, position)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (f.q) q = q.ilike('title_en', `%${f.q}%`)
  if (f.status) q = q.eq('status', f.status)
  if (f.categoryId) q = q.eq('category_id', f.categoryId)
  if (f.sellerId) q = q.eq('seller_id', f.sellerId)
  if (f.since) q = q.gte('created_at', f.since)
  if (f.featured) q = q.eq('is_featured', true)

  const { data, count: total } = await q
  const rows = (data ?? []) as Array<{
    id: string
    title_en: string
    status: string
    price_fils: number
    currency: string
    created_at: string
    is_featured: boolean
    category_id: string | null
    seller_id: string
    images: { storage_key: string; position: number }[] | null
  }>

  const sellerIds = [...new Set(rows.map((r) => r.seller_id))]
  const names = new Map<string, string>()
  if (sellerIds.length) {
    const { data: profs } = await db
      .from('profiles')
      .select('id, display_name')
      .in('id', sellerIds)
    for (const p of (profs ?? []) as { id: string; display_name: string }[])
      names.set(p.id, p.display_name)
  }

  return {
    total: total ?? 0,
    rows: rows.map((r) => {
      const cover = r.images?.length
        ? [...r.images].sort((a, b) => a.position - b.position)[0].storage_key
        : null
      return {
        id: r.id,
        title_en: r.title_en,
        status: r.status,
        price_fils: r.price_fils,
        currency: r.currency,
        created_at: r.created_at,
        is_featured: r.is_featured,
        category_id: r.category_id,
        sellerName: names.get(r.seller_id) ?? 'Unknown',
        cover: cover ? publicUrl(LISTING_IMAGES_BUCKET, cover) : null,
      }
    }),
  }
}

/* ----------------------------- users ----------------------------- */
export type AdminUser = {
  id: string
  display_name: string
  username: string | null
  email: string | null
  status: string
  isAdmin: boolean
  joined: string
  listingsCount: number
  rating: number | null
  reviewCount: number
  completedSales: number
  completedPurchases: number
}

export async function listUsers(opts: { q?: string; page?: number }): Promise<{
  rows: AdminUser[]
  total: number
}> {
  const db = admin()
  const page = Math.max(0, opts.page ?? 0)
  let pq = db
    .from('profiles')
    .select('id, display_name, username, member_since, listings_count', { count: 'exact' })
    .order('member_since', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  if (opts.q) pq = pq.or(`display_name.ilike.%${opts.q}%,username.ilike.%${opts.q}%`)

  const { data: profs, count: total } = await pq
  const rows = (profs ?? []) as Array<{
    id: string
    display_name: string
    username: string | null
    member_since: string
    listings_count: number
  }>
  const ids = rows.map((r) => r.id)
  if (ids.length === 0) return { rows: [], total: total ?? 0 }

  const [{ data: usersData }, { data: rolesData }, { data: reviewsData }, { data: ordersData }] =
    await Promise.all([
      db.from('users').select('id, email, status').in('id', ids),
      db.from('user_roles').select('user_id, role').in('user_id', ids),
      db.from('reviews').select('reviewee_id, rating').in('reviewee_id', ids),
      db.from('orders').select('buyer_id, seller_id, status').eq('status', 'completed'),
    ])

  const uMap = new Map(
    ((usersData ?? []) as { id: string; email: string | null; status: string }[]).map((u) => [
      u.id,
      u,
    ]),
  )
  const adminSet = new Set(
    ((rolesData ?? []) as { user_id: string; role: string }[])
      .filter((r) => r.role === 'admin' || r.role === 'super_admin')
      .map((r) => r.user_id),
  )
  const ratingAgg = new Map<string, { sum: number; n: number }>()
  for (const r of (reviewsData ?? []) as { reviewee_id: string; rating: number }[]) {
    const a = ratingAgg.get(r.reviewee_id) ?? { sum: 0, n: 0 }
    a.sum += r.rating
    a.n += 1
    ratingAgg.set(r.reviewee_id, a)
  }
  const sales = new Map<string, number>()
  const purchases = new Map<string, number>()
  for (const o of (ordersData ?? []) as { buyer_id: string; seller_id: string }[]) {
    sales.set(o.seller_id, (sales.get(o.seller_id) ?? 0) + 1)
    purchases.set(o.buyer_id, (purchases.get(o.buyer_id) ?? 0) + 1)
  }

  return {
    total: total ?? 0,
    rows: rows.map((r) => {
      const agg = ratingAgg.get(r.id)
      return {
        id: r.id,
        display_name: r.display_name,
        username: r.username,
        email: uMap.get(r.id)?.email ?? null,
        status: uMap.get(r.id)?.status ?? 'active',
        isAdmin: adminSet.has(r.id),
        joined: r.member_since,
        listingsCount: r.listings_count,
        rating: agg ? Math.round((agg.sum / agg.n) * 10) / 10 : null,
        reviewCount: agg?.n ?? 0,
        completedSales: sales.get(r.id) ?? 0,
        completedPurchases: purchases.get(r.id) ?? 0,
      }
    }),
  }
}

/* ----------------------------- orders ----------------------------- */
export type AdminOrder = {
  id: string
  status: string
  priceFils: number | null
  currency: string
  created_at: string
  listingTitle: string
  buyerName: string
  sellerName: string
}

export async function listOrders(opts: { status?: string; page?: number }): Promise<{
  rows: AdminOrder[]
  total: number
}> {
  const db = admin()
  const page = Math.max(0, opts.page ?? 0)
  let q = db
    .from('orders')
    .select(
      'id, status, accepted_price_fils, created_at, buyer_id, seller_id, listing:listings(title_en, currency)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  if (opts.status) {
    if (opts.status === 'active')
      q = q.in('status', ['negotiating', 'offer_sent', 'offer_accepted', 'awaiting_confirmation'])
    else q = q.eq('status', opts.status)
  }

  const { data, count: total } = await q
  const rows = (data ?? []) as Array<{
    id: string
    status: string
    accepted_price_fils: number | null
    created_at: string
    buyer_id: string
    seller_id: string
    listing: { title_en?: string; currency?: string } | { title_en?: string; currency?: string }[] | null
  }>
  const ids = [...new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id]))]
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: profs } = await db.from('profiles').select('id, display_name').in('id', ids)
    for (const p of (profs ?? []) as { id: string; display_name: string }[])
      names.set(p.id, p.display_name)
  }
  const lt = (l: (typeof rows)[number]['listing']) => {
    const o = Array.isArray(l) ? l[0] : l
    return o ?? null
  }
  return {
    total: total ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      status: r.status,
      priceFils: r.accepted_price_fils,
      currency: lt(r.listing)?.currency ?? 'AED',
      created_at: r.created_at,
      listingTitle: lt(r.listing)?.title_en ?? 'Listing unavailable',
      buyerName: names.get(r.buyer_id) ?? 'Unknown',
      sellerName: names.get(r.seller_id) ?? 'Unknown',
    })),
  }
}

/* ----------------------------- reviews ----------------------------- */
export type AdminReview = {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  reviewerName: string
  revieweeName: string
}

export async function listReviews(opts: { page?: number }): Promise<{
  rows: AdminReview[]
  total: number
}> {
  const db = admin()
  const page = Math.max(0, opts.page ?? 0)
  const { data, count: total } = await db
    .from('reviews')
    .select('id, rating, review_text, created_at, reviewer_id, reviewee_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  const rows = (data ?? []) as Array<{
    id: string
    rating: number
    review_text: string | null
    created_at: string
    reviewer_id: string
    reviewee_id: string
  }>
  const ids = [...new Set(rows.flatMap((r) => [r.reviewer_id, r.reviewee_id]))]
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: profs } = await db.from('profiles').select('id, display_name').in('id', ids)
    for (const p of (profs ?? []) as { id: string; display_name: string }[])
      names.set(p.id, p.display_name)
  }
  return {
    total: total ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      review_text: r.review_text,
      created_at: r.created_at,
      reviewerName: names.get(r.reviewer_id) ?? 'Unknown',
      revieweeName: names.get(r.reviewee_id) ?? 'Unknown',
    })),
  }
}

/* ----------------------------- moderation / reports ----------------------------- */
export type AdminReportRow = {
  id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  admin_notes: string | null
  listing_id: string | null
  reported_user_id: string | null
  message_id: string | null
  reporterName: string
  target: string
}

export async function listReports(opts: { status?: string }): Promise<AdminReportRow[]> {
  const db = admin()
  let q = db
    .from('reports')
    .select(
      'id, reason, description, status, created_at, admin_notes, listing_id, reported_user_id, message_id, reporter_id',
    )
    .order('created_at', { ascending: false })
    .limit(200)
  if (opts.status) q = q.eq('status', opts.status)
  const { data } = await q
  const rows = (data ?? []) as Array<Omit<AdminReportRow, 'reporterName' | 'target'> & { reporter_id: string }>
  const ids = [...new Set(rows.map((r) => r.reporter_id))]
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: profs } = await db.from('profiles').select('id, display_name').in('id', ids)
    for (const p of (profs ?? []) as { id: string; display_name: string }[])
      names.set(p.id, p.display_name)
  }
  return rows.map((r) => ({
    ...r,
    reporterName: names.get(r.reporter_id) ?? 'Unknown',
    target: r.listing_id
      ? 'Listing'
      : r.message_id
        ? 'Message'
        : r.reported_user_id
          ? 'User'
          : 'Unknown',
  }))
}

/* ----------------------------- audit log ----------------------------- */
export type AuditEntry = {
  id: string
  action: string
  target_type: string | null
  target_id: string | null
  detail: Record<string, unknown>
  created_at: string
  adminName: string
}

export async function listAuditLog(opts: { page?: number }): Promise<{ rows: AuditEntry[]; total: number }> {
  const db = admin()
  const page = Math.max(0, opts.page ?? 0)
  const { data, count: total } = await db
    .from('admin_audit_log')
    .select('id, action, target_type, target_id, detail, created_at, admin_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  const rows = (data ?? []) as Array<Omit<AuditEntry, 'adminName'> & { admin_id: string | null }>
  const ids = [...new Set(rows.map((r) => r.admin_id).filter(Boolean) as string[])]
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: profs } = await db.from('profiles').select('id, display_name').in('id', ids)
    for (const p of (profs ?? []) as { id: string; display_name: string }[])
      names.set(p.id, p.display_name)
  }
  return {
    total: total ?? 0,
    rows: rows.map((r) => ({ ...r, adminName: r.admin_id ? names.get(r.admin_id) ?? 'Admin' : 'System' })),
  }
}

/* ----------------------------- AI moderation log ----------------------------- */
export type AiModerationEntry = {
  id: string
  source: string
  decision: string
  confidence: number | null
  reason: string | null
  human_override: string | null
  created_at: string
  listing_id: string | null
}

export async function listAiModeration(opts: { page?: number }): Promise<{
  rows: AiModerationEntry[]
  total: number
}> {
  const db = admin()
  const page = Math.max(0, opts.page ?? 0)
  const { data, count: total } = await db
    .from('ai_moderation_log')
    .select('id, source, decision, confidence, reason, human_override, created_at, listing_id', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  return { rows: (data ?? []) as AiModerationEntry[], total: total ?? 0 }
}

/* ----------------------------- categories ----------------------------- */
export type AdminCategory = {
  id: string
  slug: string
  name_en: string
  position: number
  is_active: boolean
  parent_id: string | null
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const db = admin()
  const { data } = await db
    .from('categories')
    .select('id, slug, name_en, position, is_active, parent_id')
    .order('position', { ascending: true })
  return (data ?? []) as AdminCategory[]
}

/* ----------------------------- settings ----------------------------- */
export type MarketplaceSettings = {
  marketplace_name: string
  logo_url: string | null
  contact_email: string | null
  support_email: string | null
  terms_url: string | null
  privacy_url: string | null
  maintenance_mode: boolean
  brand_colors: Record<string, string>
  social_links: Record<string, string>
  moderation_thresholds: Record<string, number>
}

export async function getSettings(): Promise<MarketplaceSettings> {
  const db = admin()
  const { data } = await db.from('marketplace_settings').select('*').eq('id', 'global').maybeSingle()
  const s = (data ?? {}) as Partial<MarketplaceSettings>
  return {
    marketplace_name: s.marketplace_name ?? 'Query & Buy',
    logo_url: s.logo_url ?? null,
    contact_email: s.contact_email ?? null,
    support_email: s.support_email ?? 'support@queryandbuy.ae',
    terms_url: s.terms_url ?? null,
    privacy_url: s.privacy_url ?? null,
    maintenance_mode: s.maintenance_mode ?? false,
    brand_colors: s.brand_colors ?? {},
    social_links: s.social_links ?? {},
    moderation_thresholds: s.moderation_thresholds ?? { min_confidence: 70 },
  }
}

/* ----------------------------- analytics ----------------------------- */
export type Series = { label: string; value: number }[]
export type Analytics = {
  newUsers: Series
  newListings: Series
  completedSales: Series
  categoryDistribution: Series
  funnel: Series
  topKeywords: Series
}

function lastNDays(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }),
    })
  }
  return out
}

function bucketByDay(dates: string[], days: { key: string; label: string }[]): Series {
  const counts = new Map<string, number>()
  for (const iso of dates) {
    const k = new Date(iso).toISOString().slice(0, 10)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 }))
}

export async function getAnalytics(): Promise<Analytics> {
  const db = admin()
  const days = lastNDays(14)
  const since = days[0].key

  const [profiles, listings, sales, cats, listingCats, offersCount, ordersConfirmed, ordersCompleted, activeListings] =
    await Promise.all([
      db.from('profiles').select('member_since').gte('member_since', since),
      db.from('listings').select('created_at').gte('created_at', since),
      db.from('orders').select('completed_at').eq('status', 'completed').gte('completed_at', since),
      db.from('categories').select('id, name_en, parent_id'),
      db.from('listings').select('category_id').eq('status', 'active'),
      count(db, 'offers'),
      count(db, 'orders', (q) => q.in('status', ['confirmed', 'completed'])),
      count(db, 'orders', (q) => q.eq('status', 'completed')),
      count(db, 'listings', (q) => q.eq('status', 'active')),
    ])

  const catById = new Map(
    ((cats.data ?? []) as { id: string; name_en: string; parent_id: string | null }[]).map((c) => [
      c.id,
      c,
    ]),
  )
  const topName = (id: string | null): string | null => {
    let c = id ? catById.get(id) : undefined
    let guard = 0
    while (c?.parent_id && guard++ < 6) c = catById.get(c.parent_id)
    return c?.name_en ?? null
  }
  const distCounts = new Map<string, number>()
  for (const r of (listingCats.data ?? []) as { category_id: string | null }[]) {
    const name = topName(r.category_id)
    if (name) distCounts.set(name, (distCounts.get(name) ?? 0) + 1)
  }
  const categoryDistribution = [...distCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return {
    newUsers: bucketByDay(
      ((profiles.data ?? []) as { member_since: string }[]).map((r) => r.member_since),
      days,
    ),
    newListings: bucketByDay(
      ((listings.data ?? []) as { created_at: string }[]).map((r) => r.created_at),
      days,
    ),
    completedSales: bucketByDay(
      ((sales.data ?? []) as { completed_at: string | null }[])
        .map((r) => r.completed_at)
        .filter(Boolean) as string[],
      days,
    ),
    categoryDistribution,
    funnel: [
      { label: 'Active listings', value: activeListings },
      { label: 'Offers made', value: offersCount },
      { label: 'Orders confirmed', value: ordersConfirmed },
      { label: 'Completed', value: ordersCompleted },
    ],
    // No search-query log exists yet — surfaced honestly as empty rather than faked.
    topKeywords: [],
  }
}
