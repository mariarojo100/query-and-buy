/**
 * lib/db/listings — listings repository (Phase 4).
 * ===========================================================================
 * Replaces the listings RLS family:
 *   - public feed reads only ever return status='active' AND deleted_at IS NULL
 *     (same as before — no viewer needed);
 *   - getMyListings / getListingForEdit are owner-scoped (seller_id = viewer.id);
 *   - getListingById applies listingVisibleWhere(viewer) — the full policy
 *     (active ∨ owner ∨ staff ∨ order-participant), so a draft/sold/reserved
 *     listing is only visible to those allowed to see it.
 *
 * DTOs (FeedListing, ListingDetail, MyListing, EditListing, …) are reproduced
 * exactly so page/component consumers are untouched.
 */
import { db } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma/client'
import type { ListingCondition, Emirate } from '@/lib/generated/prisma/enums'
import { listingVisibleWhere } from '@/lib/authz/policies'
import type { Viewer } from '@/lib/authz/viewer'
import type { AttrFilter } from '@/lib/listings/attributeSchemas'

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
  attributes: Record<string, string>
  category_name: string | null
  category_slug: string | null
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
  attributes: Record<string, string>
  status: string
  images: { storage_key: string; position: number }[]
}

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
  sinceDays?: number
  sort?: SortKey
  limit?: number
  /** Category-specific facet filters (already validated against the schema). */
  attributes?: AttrFilter[]
}

export type CategoryLite = {
  id: string
  slug: string
  name_en: string
  parent_id: string | null
  position: number
}

// --- shared mapping helpers -------------------------------------------------

function coverKey(images: { storage_key: string; position: number }[] | null | undefined): string | null {
  if (!images?.length) return null
  return [...images].sort((a, b) => a.position - b.position)[0].storage_key
}

const feedSelect = {
  id: true,
  titleEn: true,
  priceFils: true,
  currency: true,
  emirate: true,
  area: true,
  condition: true,
  sellerId: true,
  publishedAt: true,
  isFeatured: true,
  viewCount: true,
  images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' } },
  seller: {
    select: {
      profile: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, badgeLevel: true, emailVerified: true },
      },
    },
  },
} satisfies Prisma.ListingSelect

type FeedRow = Prisma.ListingGetPayload<{ select: typeof feedSelect }>

function sellerMiniOf(p: FeedRow['seller']['profile']): SellerMini | null {
  if (!p) return null
  return {
    id: p.id,
    username: p.username,
    display_name: p.displayName,
    avatar_url: p.avatarUrl,
    badge_level: p.badgeLevel,
    email_verified: p.emailVerified,
  }
}

function mapFeed(l: FeedRow): FeedListing {
  return {
    id: l.id,
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
    seller: sellerMiniOf(l.seller.profile),
  }
}

// --- browse / search (FTS needs raw SQL) ------------------------------------

type RawFeedRow = {
  id: string
  title_en: string
  price_fils: bigint
  currency: string
  emirate: string | null
  area: string | null
  condition: string
  seller_id: string
  published_at: Date | null
  is_featured: boolean
  view_count: number
  images: { storage_key: string; position: number }[] | null
}

function orderBySql(sort?: SortKey): Prisma.Sql {
  switch (sort) {
    case 'price_asc':
      return Prisma.sql`order by l.price_fils asc`
    case 'price_desc':
      return Prisma.sql`order by l.price_fils desc`
    case 'oldest':
      return Prisma.sql`order by l.published_at asc nulls last`
    case 'most_viewed':
      return Prisma.sql`order by l.view_count desc`
    case 'recently_updated':
      return Prisma.sql`order by l.updated_at desc`
    case 'featured_first':
      return Prisma.sql`order by l.is_featured desc, l.published_at desc nulls last`
    default:
      return Prisma.sql`order by l.published_at desc nulls last`
  }
}

async function sellerMapFor(ids: string[]): Promise<Map<string, SellerMini>> {
  const map = new Map<string, SellerMini>()
  if (!ids.length) return map
  const profs = await db.profile.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, displayName: true, avatarUrl: true, badgeLevel: true, emailVerified: true },
  })
  for (const p of profs) {
    map.set(p.id, {
      id: p.id,
      username: p.username,
      display_name: p.displayName,
      avatar_url: p.avatarUrl,
      badge_level: p.badgeLevel,
      email_verified: p.emailVerified,
    })
  }
  return map
}

function mapRaw(r: RawFeedRow, sellers: Map<string, SellerMini>): FeedListing {
  return {
    id: r.id,
    title_en: r.title_en,
    price_fils: Number(r.price_fils),
    currency: r.currency,
    emirate: r.emirate,
    area: r.area,
    condition: r.condition,
    cover_key: coverKey(r.images),
    published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
    is_featured: r.is_featured,
    view_count: r.view_count ?? 0,
    seller: sellers.get(r.seller_id) ?? null,
  }
}

/** Filtered + sorted active listings (homepage, category, search). FTS on search_vector. */
export async function filteredListings(filters: ListingFilters = {}): Promise<{ listings: FeedListing[]; count: number }> {
  const limit = filters.limit ?? 48
  const conds: Prisma.Sql[] = [Prisma.sql`l.status = 'active'`, Prisma.sql`l.deleted_at is null`]

  const q = filters.q?.trim()
  if (q) {
    const safe = q.replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()
    if (safe) {
      const like = `%${safe}%`
      conds.push(
        Prisma.sql`(l.search_vector @@ websearch_to_tsquery('simple', ${safe}) or l.title_en ilike ${like} or l.description ilike ${like})`,
      )
    }
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    conds.push(Prisma.sql`l.category_id = any(${filters.categoryIds}::uuid[])`)
  }
  if (filters.emirate) conds.push(Prisma.sql`l.emirate = ${filters.emirate}::emirate`)
  if (filters.condition) conds.push(Prisma.sql`l.condition = ${filters.condition}::listing_condition`)
  if (typeof filters.minFils === 'number') conds.push(Prisma.sql`l.price_fils >= ${filters.minFils}`)
  if (typeof filters.maxFils === 'number') conds.push(Prisma.sql`l.price_fils <= ${filters.maxFils}`)
  if (filters.negotiable) conds.push(Prisma.sql`l.is_negotiable = true`)
  if (filters.featured) conds.push(Prisma.sql`l.is_featured = true`)
  if (filters.sinceDays && filters.sinceDays > 0) {
    const since = new Date(Date.now() - filters.sinceDays * 86_400_000)
    conds.push(Prisma.sql`l.published_at >= ${since}`)
  }
  for (const a of filters.attributes ?? []) {
    // key is a schema-whitelisted field key ([a-z_]); value is a bound param.
    if (a.op === 'eq') {
      conds.push(Prisma.sql`l.attributes ->> ${a.key} = ${a.value}`)
    } else {
      // CASE guards the numeric cast so a non-numeric facet value can't error the query.
      const n = Number(a.value)
      const guarded = Prisma.sql`(case when (l.attributes ->> ${a.key}) ~ '^[0-9.]+$' then (l.attributes ->> ${a.key})::numeric end)`
      conds.push(a.op === 'min' ? Prisma.sql`${guarded} >= ${n}` : Prisma.sql`${guarded} <= ${n}`)
    }
  }
  const where = Prisma.join(conds, ' and ')

  const rows = await db.$queryRaw<RawFeedRow[]>(Prisma.sql`
    select l.id, l.title_en, l.price_fils, l.currency, l.emirate, l.area, l.condition, l.seller_id,
           l.published_at, l.is_featured, l.view_count,
           coalesce((select jsonb_agg(jsonb_build_object('storage_key', li.storage_key, 'position', li.position) order by li.position)
                     from listing_images li where li.listing_id = l.id), '[]'::jsonb) as images
    from listings l
    where ${where}
    ${orderBySql(filters.sort)}
    limit ${limit}
  `)
  const countRes = await db.$queryRaw<{ count: number }[]>(
    Prisma.sql`select count(*)::int as count from listings l where ${where}`,
  )
  const count = countRes[0]?.count ?? rows.length
  const sellers = await sellerMapFor([...new Set(rows.map((r) => r.seller_id))])
  return { listings: rows.map((r) => mapRaw(r, sellers)), count }
}

// --- other public feeds (Prisma query builder) ------------------------------

export async function featuredListings(limit = 8): Promise<FeedListing[]> {
  const rows = await db.listing.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      isFeatured: true,
      OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
    },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    take: limit,
    select: feedSelect,
  })
  return rows.map(mapFeed)
}

export async function listingsByIds(ids: string[]): Promise<FeedListing[]> {
  if (ids.length === 0) return []
  const rows = await db.listing.findMany({
    where: { id: { in: ids }, status: 'active', deletedAt: null },
    select: feedSelect,
  })
  const byId = new Map(rows.map((r) => [r.id, mapFeed(r)]))
  return ids.map((id) => byId.get(id)).filter((l): l is FeedListing => !!l)
}

export async function similarListings(listingId: string, limit = 8): Promise<FeedListing[]> {
  const base = await db.listing.findUnique({
    where: { id: listingId },
    select: { categoryId: true, priceFils: true, emirate: true },
  })
  if (!base) return []
  const price = Number(base.priceFils)
  const lo = Math.round(price * 0.4)
  const hi = Math.round(price * 1.6)

  const rows = new Map<string, FeedRow>()
  const inBand = await db.listing.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      id: { not: listingId },
      priceFils: { gte: lo, lte: hi },
      ...(base.categoryId ? { categoryId: base.categoryId } : {}),
    },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    take: limit * 3,
    select: feedSelect,
  })
  for (const r of inBand) rows.set(r.id, r)

  if (rows.size < limit && base.categoryId) {
    const more = await db.listing.findMany({
      where: { status: 'active', deletedAt: null, id: { not: listingId }, categoryId: base.categoryId },
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      take: limit * 2,
      select: feedSelect,
    })
    for (const r of more) if (!rows.has(r.id)) rows.set(r.id, r)
  }

  const ranked = [...rows.values()]
    .sort((a, c) => (c.emirate === base.emirate ? 1 : 0) - (a.emirate === base.emirate ? 1 : 0))
    .slice(0, limit)
  return ranked.map(mapFeed)
}

export async function sellerListings(
  sellerId: string,
  opts?: { excludeId?: string; limit?: number },
): Promise<FeedListing[]> {
  const rows = await db.listing.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      sellerId,
      ...(opts?.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    take: opts?.limit ?? 12,
    select: feedSelect,
  })
  return rows.map(mapFeed)
}

// --- categories -------------------------------------------------------------

export async function activeCategories(): Promise<CategoryLite[]> {
  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    select: { id: true, slug: true, nameEn: true, parentId: true, position: true },
  })
  return rows.map((c) => ({ id: c.id, slug: c.slug, name_en: c.nameEn, parent_id: c.parentId, position: c.position }))
}

export async function categoryCounts(categories: CategoryLite[]): Promise<Map<string, number>> {
  const grouped = await db.listing.groupBy({
    by: ['categoryId'],
    where: { status: 'active', deletedAt: null },
    _count: { categoryId: true },
  })

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
  for (const g of grouped) {
    const slug = topSlug(g.categoryId)
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + g._count.categoryId)
  }
  return counts
}

export async function categoryBySlug(slug: string): Promise<{ category: CategoryLite; ids: string[] } | null> {
  const cat = await db.category.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true, nameEn: true, parentId: true, position: true },
  })
  if (!cat) return null
  const category: CategoryLite = {
    id: cat.id,
    slug: cat.slug,
    name_en: cat.nameEn,
    parent_id: cat.parentId,
    position: cat.position,
  }
  const kids = await db.category.findMany({ where: { parentId: category.id, isActive: true }, select: { id: true } })
  return { category, ids: [category.id, ...kids.map((k) => k.id)] }
}

// --- viewer-scoped: my listings, edit loader, visible detail ----------------

export async function myListings(viewer: Viewer): Promise<MyListing[]> {
  const rows = await db.listing.findMany({
    where: { sellerId: viewer.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      titleEn: true,
      priceFils: true,
      currency: true,
      status: true,
      viewCount: true,
      createdAt: true,
      emirate: true,
      area: true,
      isFeatured: true,
      images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' } },
    },
  })

  const favMap = new Map<string, number>()
  if (rows.length) {
    const favs = await db.favorite.groupBy({
      by: ['listingId'],
      where: { listingId: { in: rows.map((r) => r.id) } },
      _count: { listingId: true },
    })
    for (const f of favs) favMap.set(f.listingId, f._count.listingId)
  }

  return rows.map((r) => ({
    id: r.id,
    title_en: r.titleEn,
    price_fils: Number(r.priceFils),
    currency: r.currency,
    status: r.status,
    view_count: r.viewCount,
    created_at: r.createdAt.toISOString(),
    emirate: r.emirate,
    area: r.area,
    is_featured: r.isFeatured,
    favorites_count: favMap.get(r.id) ?? 0,
    cover_key: r.images[0]?.storageKey ?? null,
  }))
}

export async function listingForEdit(viewer: Viewer, id: string): Promise<EditListing | null> {
  const row = await db.listing.findFirst({
    where: { id, sellerId: viewer.id }, // owner-only
    select: {
      id: true,
      titleEn: true,
      description: true,
      priceFils: true,
      isNegotiable: true,
      condition: true,
      categoryId: true,
      emirate: true,
      area: true,
      attributes: true,
      status: true,
      images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' } },
    },
  })
  if (!row) return null
  return {
    id: row.id,
    title_en: row.titleEn,
    description: row.description,
    price_fils: Number(row.priceFils),
    is_negotiable: row.isNegotiable,
    condition: row.condition,
    category_id: row.categoryId,
    emirate: row.emirate,
    area: row.area,
    attributes: toAttrMap(row.attributes),
    status: row.status,
    images: row.images.map((i) => ({ storage_key: i.storageKey, position: i.position })),
  }
}

export async function listingByIdVisible(viewer: Viewer | null, id: string): Promise<ListingDetail | null> {
  const row = await db.listing.findFirst({
    where: { AND: [{ id }, listingVisibleWhere(viewer)] },
    select: {
      id: true,
      titleEn: true,
      description: true,
      priceFils: true,
      currency: true,
      isNegotiable: true,
      condition: true,
      status: true,
      emirate: true,
      area: true,
      attributes: true,
      publishedAt: true,
      createdAt: true,
      sellerId: true,
      category: { select: { nameEn: true, slug: true } },
      images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' } },
      seller: {
        select: {
          profile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              badgeLevel: true,
              bio: true,
              emirate: true,
              memberSince: true,
              listingsCount: true,
              emailVerified: true,
              phoneVerified: true,
              reportsCount: true,
            },
          },
        },
      },
    },
  })
  if (!row) return null
  const p = row.seller.profile
  return {
    id: row.id,
    title_en: row.titleEn,
    description: row.description,
    price_fils: Number(row.priceFils),
    currency: row.currency,
    is_negotiable: row.isNegotiable,
    condition: row.condition,
    status: row.status,
    emirate: row.emirate,
    area: row.area,
    attributes: toAttrMap(row.attributes),
    category_name: row.category?.nameEn ?? null,
    category_slug: row.category?.slug ?? null,
    published_at: row.publishedAt ? row.publishedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    seller_id: row.sellerId,
    images: row.images.map((i) => ({ storage_key: i.storageKey, position: i.position })),
    seller: p
      ? {
          id: p.id,
          username: p.username,
          display_name: p.displayName,
          avatar_url: p.avatarUrl,
          badge_level: p.badgeLevel,
          bio: p.bio,
          emirate: p.emirate,
          member_since: p.memberSince.toISOString(),
          listings_count: p.listingsCount,
          email_verified: p.emailVerified,
          phone_verified: p.phoneVerified,
          reports_count: p.reportsCount,
        }
      : null,
  }
}

// --- owner-scoped writes (Phase 4) ------------------------------------------

export type ListingImageInput = {
  storage_key: string
  position: number
  width?: number | null
  height?: number | null
}

export type WriteListingInput = {
  title: string
  description: string
  priceFils: number
  categoryId: string
  condition: string
  emirate: string
  area: string | null
  isNegotiable: boolean
  /** Category-specific facets, already sanitised. Stored on Listing.attributes. */
  attributes?: Record<string, string>
  images: ListingImageInput[]
}

export async function categoryIsActive(id: string): Promise<boolean> {
  const c = await db.category.findFirst({ where: { id, isActive: true }, select: { id: true } })
  return !!c
}

/** Resolve a category's slug and its parent's slug — used to pick its attribute schema. */
export async function categorySlugChain(
  id: string,
): Promise<{ slug: string; parentSlug: string | null } | null> {
  const c = await db.category.findFirst({
    where: { id },
    select: { slug: true, parent: { select: { slug: true } } },
  })
  if (!c) return null
  return { slug: c.slug, parentSlug: c.parent?.slug ?? null }
}

/** Coerce a jsonb attributes value into a flat string map for DTOs. */
function toAttrMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val != null) out[k] = String(val)
  }
  return out
}

function imageCreateRows(listingId: string, images: ListingImageInput[]) {
  return images.map((im) => ({
    listingId,
    storageKey: im.storage_key,
    position: im.position,
    width: im.width ?? null,
    height: im.height ?? null,
  }))
}

/** Create a listing owned by the viewer (+ its images) in one write. */
export async function createListingFor(viewer: Viewer, input: WriteListingInput): Promise<{ id?: string; error?: string }> {
  if (!(await categoryIsActive(input.categoryId))) return { error: 'That category is unavailable.' }
  const now = new Date()
  const expires = new Date(now.getTime() + 30 * 86_400_000)
  const listing = await db.listing.create({
    data: {
      sellerId: viewer.id,
      categoryId: input.categoryId,
      titleEn: input.title,
      description: input.description,
      priceFils: BigInt(input.priceFils),
      condition: input.condition as ListingCondition,
      emirate: input.emirate as Emirate,
      area: input.area,
      isNegotiable: input.isNegotiable,
      attributes: input.attributes ?? {},
      status: 'active',
      publishedAt: now,
      expiresAt: expires,
      images: { create: imageCreateRows('', input.images).map(({ listingId: _drop, ...rest }) => rest) },
    },
    select: { id: true },
  })
  return { id: listing.id }
}

/** Update a listing's fields + replace its image set. Owner-only. Returns removed storage keys. */
export async function updateListingFor(
  viewer: Viewer,
  input: WriteListingInput & { id: string },
): Promise<{ ok: true; removedKeys: string[] } | { error: string }> {
  if (!(await categoryIsActive(input.categoryId))) return { error: 'That category is unavailable.' }
  const outcome = await db.$transaction(async (tx) => {
    const upd = await tx.listing.updateMany({
      where: { id: input.id, sellerId: viewer.id },
      data: {
        titleEn: input.title,
        description: input.description,
        priceFils: BigInt(input.priceFils),
        categoryId: input.categoryId,
        condition: input.condition as ListingCondition,
        emirate: input.emirate as Emirate,
        area: input.area,
        isNegotiable: input.isNegotiable,
        attributes: input.attributes ?? {},
      },
    })
    if (upd.count === 0) return { notFound: true as const }
    const existing = await tx.listingImage.findMany({ where: { listingId: input.id }, select: { storageKey: true } })
    const finalKeys = new Set(input.images.map((i) => i.storage_key))
    const removed = existing.map((e) => e.storageKey).filter((k) => !finalKeys.has(k))
    await tx.listingImage.deleteMany({ where: { listingId: input.id } })
    await tx.listingImage.createMany({ data: imageCreateRows(input.id, input.images) })
    return { removed }
  })
  if ('notFound' in outcome) return { error: 'Listing not found.' }
  return { ok: true, removedKeys: outcome.removed }
}

export async function markListingSoldFor(viewer: Viewer, id: string): Promise<boolean> {
  const r = await db.listing.updateMany({ where: { id, sellerId: viewer.id }, data: { status: 'sold' } })
  return r.count > 0
}

export async function softDeleteListingFor(viewer: Viewer, id: string): Promise<boolean> {
  const r = await db.listing.updateMany({ where: { id, sellerId: viewer.id }, data: { status: 'deleted', deletedAt: new Date() } })
  return r.count > 0
}

export async function setListingPausedFor(viewer: Viewer, id: string, paused: boolean): Promise<boolean> {
  const r = await db.listing.updateMany({
    where: { id, sellerId: viewer.id, status: paused ? 'active' : 'draft' },
    data: { status: paused ? 'draft' : 'active' },
  })
  return r.count > 0
}

/** Increment a listing's view counter (any viewer; a public counter, no-op if missing). */
export async function bumpViewCount(listingId: string): Promise<void> {
  await db.listing.updateMany({ where: { id: listingId }, data: { viewCount: { increment: 1 } } })
}

/** Record the viewer's recently-viewed entry (owner-scoped upsert). */
export async function recordListingView(viewer: Viewer, listingId: string): Promise<void> {
  await db.listingView.upsert({
    where: { userId_listingId: { userId: viewer.id, listingId } },
    create: { userId: viewer.id, listingId },
    update: { viewedAt: new Date() },
  })
}
