/**
 * lib/db/system/admin — privileged admin dashboard reads + moderation writes
 * (Phase 4). Everything here is authorized by requireAdmin at the entry points
 * (lib/admin/queries.ts re-exports the reads; app/admin/actions.ts wraps the
 * writes). System repo: importable only from the allowlist.
 */
import { db } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma/client'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'

export const PAGE_SIZE = 25

function startOfToday(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
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
  const today = startOfToday()
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
    db.profile.count(),
    db.user.count({ where: { status: 'active' } }),
    db.profile.count({ where: { memberSince: { gte: today } } }),
    db.listing.count(),
    db.listing.count({ where: { status: 'active' } }),
    db.listing.count({ where: { status: 'reserved' } }),
    db.listing.count({ where: { status: 'sold' } }),
    db.listing.count({ where: { status: 'pending_review' } }),
    db.message.count({ where: { createdAt: { gte: today } } }),
    db.offer.count(),
    db.order.count({ where: { status: { in: ['confirmed', 'completed'] } } }),
    db.review.count(),
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

export async function listListings(f: ListingFilters): Promise<{ rows: AdminListing[]; total: number }> {
  const page = Math.max(0, f.page ?? 0)
  const where: Prisma.ListingWhereInput = {
    ...(f.q ? { titleEn: { contains: f.q, mode: 'insensitive' } } : {}),
    ...(f.status ? { status: f.status as Prisma.ListingWhereInput['status'] } : {}),
    ...(f.categoryId ? { categoryId: f.categoryId } : {}),
    ...(f.sellerId ? { sellerId: f.sellerId } : {}),
    ...(f.since ? { createdAt: { gte: new Date(f.since) } } : {}),
    ...(f.featured ? { isFeatured: true } : {}),
  }
  const [rows, total] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        titleEn: true,
        status: true,
        priceFils: true,
        currency: true,
        createdAt: true,
        isFeatured: true,
        categoryId: true,
        images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' }, take: 1 },
        seller: { select: { profile: { select: { displayName: true } } } },
      },
    }),
    db.listing.count({ where }),
  ])
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      title_en: r.titleEn,
      status: r.status,
      price_fils: Number(r.priceFils),
      currency: r.currency,
      created_at: r.createdAt.toISOString(),
      is_featured: r.isFeatured,
      category_id: r.categoryId,
      sellerName: r.seller.profile?.displayName ?? 'Unknown',
      cover: r.images[0]?.storageKey ? publicUrl(LISTING_IMAGES_BUCKET, r.images[0].storageKey) : null,
    })),
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

export async function listUsers(opts: { q?: string; page?: number }): Promise<{ rows: AdminUser[]; total: number }> {
  const page = Math.max(0, opts.page ?? 0)
  const where: Prisma.ProfileWhereInput = opts.q
    ? { OR: [{ displayName: { contains: opts.q, mode: 'insensitive' } }, { username: { contains: opts.q, mode: 'insensitive' } }] }
    : {}
  const [profs, total] = await Promise.all([
    db.profile.findMany({
      where,
      orderBy: { memberSince: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        displayName: true,
        username: true,
        memberSince: true,
        listingsCount: true,
        user: { select: { email: true, status: true, roles: { select: { role: true } } } },
      },
    }),
    db.profile.count({ where }),
  ])
  const ids = profs.map((p) => p.id)
  if (!ids.length) return { rows: [], total }

  const [reviews, orders] = await Promise.all([
    db.review.groupBy({ by: ['revieweeId'], where: { revieweeId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } }),
    db.order.findMany({ where: { status: 'completed', OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] }, select: { buyerId: true, sellerId: true } }),
  ])
  const ratingMap = new Map(reviews.map((r) => [r.revieweeId, { avg: r._avg.rating, n: r._count._all }]))
  const sales = new Map<string, number>()
  const purchases = new Map<string, number>()
  for (const o of orders) {
    sales.set(o.sellerId, (sales.get(o.sellerId) ?? 0) + 1)
    purchases.set(o.buyerId, (purchases.get(o.buyerId) ?? 0) + 1)
  }

  return {
    total,
    rows: profs.map((p) => {
      const agg = ratingMap.get(p.id)
      return {
        id: p.id,
        display_name: p.displayName,
        username: p.username,
        email: p.user?.email ?? null,
        status: p.user?.status ?? 'active',
        isAdmin: (p.user?.roles ?? []).some((r) => r.role === 'admin' || r.role === 'super_admin'),
        joined: p.memberSince.toISOString(),
        listingsCount: p.listingsCount,
        rating: agg?.avg != null ? Math.round(agg.avg * 10) / 10 : null,
        reviewCount: agg?.n ?? 0,
        completedSales: sales.get(p.id) ?? 0,
        completedPurchases: purchases.get(p.id) ?? 0,
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

export async function listOrders(opts: { status?: string; page?: number }): Promise<{ rows: AdminOrder[]; total: number }> {
  const page = Math.max(0, opts.page ?? 0)
  const where: Prisma.OrderWhereInput = opts.status
    ? opts.status === 'active'
      ? { status: { in: ['negotiating', 'offer_sent', 'offer_accepted', 'awaiting_confirmation'] } }
      : { status: opts.status }
    : {}
  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        acceptedPriceFils: true,
        createdAt: true,
        listing: { select: { titleEn: true, currency: true } },
        buyer: { select: { displayName: true } },
        seller: { select: { displayName: true } },
      },
    }),
    db.order.count({ where }),
  ])
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      status: r.status,
      priceFils: r.acceptedPriceFils == null ? null : Number(r.acceptedPriceFils),
      currency: r.listing?.currency ?? 'AED',
      created_at: r.createdAt.toISOString(),
      listingTitle: r.listing?.titleEn ?? 'Listing unavailable',
      buyerName: r.buyer?.displayName ?? 'Unknown',
      sellerName: r.seller?.displayName ?? 'Unknown',
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

export async function listReviews(opts: { page?: number }): Promise<{ rows: AdminReview[]; total: number }> {
  const page = Math.max(0, opts.page ?? 0)
  const [rows, total] = await Promise.all([
    db.review.findMany({
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        reviewText: true,
        createdAt: true,
        reviewer: { select: { displayName: true } },
        reviewee: { select: { displayName: true } },
      },
    }),
    db.review.count(),
  ])
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      review_text: r.reviewText,
      created_at: r.createdAt.toISOString(),
      reviewerName: r.reviewer?.displayName ?? 'Unknown',
      revieweeName: r.reviewee?.displayName ?? 'Unknown',
    })),
  }
}

/* ----------------------------- reports ----------------------------- */
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
  const rows = await db.report.findMany({
    where: opts.status ? { status: opts.status } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      reason: true,
      description: true,
      status: true,
      createdAt: true,
      adminNotes: true,
      listingId: true,
      reportedUserId: true,
      messageId: true,
      reporter: { select: { displayName: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    description: r.description,
    status: r.status,
    created_at: r.createdAt.toISOString(),
    admin_notes: r.adminNotes,
    listing_id: r.listingId,
    reported_user_id: r.reportedUserId,
    message_id: r.messageId,
    reporterName: r.reporter?.displayName ?? 'Unknown',
    target: r.listingId ? 'Listing' : r.messageId ? 'Message' : r.reportedUserId ? 'User' : 'Unknown',
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
  const page = Math.max(0, opts.page ?? 0)
  const [rows, total] = await Promise.all([
    db.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        detail: true,
        createdAt: true,
        admin: { select: { displayName: true } },
      },
    }),
    db.adminAuditLog.count(),
  ])
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      action: r.action,
      target_type: r.targetType,
      target_id: r.targetId,
      detail: (r.detail ?? {}) as Record<string, unknown>,
      created_at: r.createdAt.toISOString(),
      adminName: r.admin?.displayName ?? 'System',
    })),
  }
}

/* ----------------------------- AI moderation ----------------------------- */
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

export async function listAiModeration(opts: { page?: number }): Promise<{ rows: AiModerationEntry[]; total: number }> {
  const page = Math.max(0, opts.page ?? 0)
  const [rows, total] = await Promise.all([
    db.aiModerationLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, source: true, decision: true, confidence: true, reason: true, humanOverride: true, createdAt: true, listingId: true },
    }),
    db.aiModerationLog.count(),
  ])
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      source: r.source,
      decision: r.decision,
      confidence: r.confidence == null ? null : Number(r.confidence),
      reason: r.reason,
      human_override: r.humanOverride,
      created_at: r.createdAt.toISOString(),
      listing_id: r.listingId,
    })),
  }
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
  const rows = await db.category.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, slug: true, nameEn: true, position: true, isActive: true, parentId: true },
  })
  return rows.map((c) => ({ id: c.id, slug: c.slug, name_en: c.nameEn, position: c.position, is_active: c.isActive, parent_id: c.parentId }))
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
  const s = await db.marketplaceSetting.findUnique({ where: { id: 'global' } })
  return {
    marketplace_name: s?.marketplaceName ?? 'Query & Buy',
    logo_url: s?.logoUrl ?? null,
    contact_email: s?.contactEmail ?? null,
    support_email: s?.supportEmail ?? 'support@queryandbuy.ae',
    terms_url: s?.termsUrl ?? null,
    privacy_url: s?.privacyUrl ?? null,
    maintenance_mode: s?.maintenanceMode ?? false,
    brand_colors: (s?.brandColors ?? {}) as Record<string, string>,
    social_links: (s?.socialLinks ?? {}) as Record<string, string>,
    moderation_thresholds: (s?.moderationThresholds ?? { min_confidence: 70 }) as Record<string, number>,
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
    out.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }) })
  }
  return out
}
function bucketByDay(dates: Date[], days: { key: string; label: string }[]): Series {
  const counts = new Map<string, number>()
  for (const d of dates) {
    const k = d.toISOString().slice(0, 10)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 }))
}

export async function getAnalytics(): Promise<Analytics> {
  const days = lastNDays(14)
  const since = new Date(days[0].key)

  const [profiles, listings, sales, cats, listingCats, offers, ordersConfirmed, ordersCompleted, activeListings] =
    await Promise.all([
      db.profile.findMany({ where: { memberSince: { gte: since } }, select: { memberSince: true } }),
      db.listing.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      db.order.findMany({ where: { status: 'completed', completedAt: { gte: since } }, select: { completedAt: true } }),
      db.category.findMany({ select: { id: true, nameEn: true, parentId: true } }),
      db.listing.findMany({ where: { status: 'active' }, select: { categoryId: true } }),
      db.offer.count(),
      db.order.count({ where: { status: { in: ['confirmed', 'completed'] } } }),
      db.order.count({ where: { status: 'completed' } }),
      db.listing.count({ where: { status: 'active' } }),
    ])

  const catById = new Map(cats.map((c) => [c.id, c]))
  const topName = (id: string | null): string | null => {
    let c = id ? catById.get(id) : undefined
    let guard = 0
    while (c?.parentId && guard++ < 6) c = catById.get(c.parentId)
    return c?.nameEn ?? null
  }
  const distCounts = new Map<string, number>()
  for (const r of listingCats) {
    const name = topName(r.categoryId)
    if (name) distCounts.set(name, (distCounts.get(name) ?? 0) + 1)
  }
  const categoryDistribution = [...distCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return {
    newUsers: bucketByDay(profiles.map((r) => r.memberSince), days),
    newListings: bucketByDay(listings.map((r) => r.createdAt), days),
    completedSales: bucketByDay(sales.map((r) => r.completedAt).filter((d): d is Date => !!d), days),
    categoryDistribution,
    funnel: [
      { label: 'Active listings', value: activeListings },
      { label: 'Offers made', value: offers },
      { label: 'Orders confirmed', value: ordersConfirmed },
      { label: 'Completed', value: ordersCompleted },
    ],
    topKeywords: [],
  }
}

/* ============================= MUTATIONS ============================= */
type R = { ok?: boolean; error?: string }

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002'
}

/** Append an entry to admin_audit_log. Never throws. */
export async function logAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: { adminId, action, targetType, targetId, detail: detail as Prisma.InputJsonValue },
    })
  } catch {
    /* audit logging must never block the action */
  }
}

export async function setListingState(adminId: string, id: string, op: 'hide' | 'restore' | 'delete' | 'inappropriate'): Promise<R> {
  const data =
    op === 'restore'
      ? { status: 'active' as const, deletedAt: null }
      : op === 'delete'
        ? { status: 'deleted' as const, deletedAt: new Date() }
        : { status: 'rejected' as const }
  await db.listing.update({ where: { id }, data })
  await logAudit(adminId, `listing_${op}`, 'listing', id)
  return { ok: true }
}

export async function setListingFeatured(adminId: string, id: string, featured: boolean, days?: number): Promise<R> {
  const featuredUntil = featured && days ? new Date(Date.now() + days * 86_400_000) : null
  await db.listing.update({ where: { id }, data: { isFeatured: featured, featuredUntil } })
  await logAudit(adminId, featured ? 'listing_feature' : 'listing_unfeature', 'listing', id, { days: days ?? null })
  return { ok: true }
}

export async function setUserStatus(adminId: string, id: string, status: 'active' | 'suspended' | 'banned'): Promise<R> {
  await db.user.update({ where: { id }, data: { status } })
  await logAudit(adminId, `user_${status}`, 'user', id)
  if (status !== 'active') {
    try {
      await db.notification.create({
        data: {
          userId: id,
          type: 'account',
          title: status === 'banned' ? 'Your account was banned' : 'Your account was suspended',
          body: 'Contact support if you believe this is a mistake.',
          link: '/account',
        },
      })
    } catch {
      /* ignore */
    }
  }
  return { ok: true }
}

export async function setAdminRole(adminId: string, id: string, makeAdmin: boolean): Promise<R> {
  if (makeAdmin) {
    await db.userRole.upsert({
      where: { userId_role: { userId: id, role: 'admin' } },
      create: { userId: id, role: 'admin', grantedBy: adminId },
      update: {},
    })
  } else {
    if (id === adminId) return { error: "You can't remove your own admin role." }
    await db.userRole.deleteMany({ where: { userId: id, role: { in: ['admin', 'super_admin'] } } })
  }
  await logAudit(adminId, makeAdmin ? 'user_promote_admin' : 'user_remove_admin', 'user', id)
  return { ok: true }
}

export async function moderateReport(
  adminId: string,
  reportId: string,
  action: 'dismiss' | 'remove_content' | 'warn' | 'suspend' | 'ban',
  notes?: string,
): Promise<R> {
  const report = await db.report.findUnique({ where: { id: reportId }, select: { listingId: true, reportedUserId: true } })
  if (!report) return { error: 'Report not found.' }

  if (action === 'remove_content' && report.listingId) {
    await db.listing.update({ where: { id: report.listingId }, data: { status: 'deleted', deletedAt: new Date() } })
  }
  if ((action === 'suspend' || action === 'ban') && report.reportedUserId) {
    await db.user.update({ where: { id: report.reportedUserId }, data: { status: action === 'ban' ? 'banned' : 'suspended' } })
  }
  if (action === 'warn' && report.reportedUserId) {
    try {
      await db.notification.create({
        data: {
          userId: report.reportedUserId,
          type: 'account',
          title: 'Warning from Query & Buy',
          body: notes || 'A report about your activity was reviewed by our team.',
          link: '/account',
        },
      })
    } catch {
      /* ignore */
    }
  }
  await db.report.update({ where: { id: reportId }, data: { status: action === 'dismiss' ? 'closed' : 'reviewed', adminNotes: notes ?? null } })
  await logAudit(adminId, `report_${action}`, 'report', reportId, { notes: notes ?? null })
  return { ok: true }
}

export async function removeReview(adminId: string, id: string): Promise<R> {
  await db.review.delete({ where: { id } })
  await logAudit(adminId, 'review_remove', 'review', id)
  return { ok: true }
}

export async function setAiOverride(adminId: string, id: string, override: 'approved' | 'rejected'): Promise<R> {
  await db.aiModerationLog.update({ where: { id }, data: { humanOverride: override } })
  await logAudit(adminId, `ai_override_${override}`, 'ai_moderation', id)
  return { ok: true }
}

export async function createCategory(adminId: string, input: { slug: string; name_en: string; name_ar?: string }): Promise<R> {
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  if (!slug || !input.name_en.trim()) return { error: 'Slug and English name are required.' }
  const max = await db.category.findFirst({ orderBy: { position: 'desc' }, select: { position: true } })
  const position = (max?.position ?? 0) + 1
  try {
    await db.category.create({
      data: { slug, nameEn: input.name_en.trim(), nameAr: input.name_ar?.trim() || input.name_en.trim(), position, isActive: true },
    })
  } catch (e) {
    return { error: isUniqueViolation(e) ? 'That slug already exists.' : 'Could not create category.' }
  }
  await logAudit(adminId, 'category_create', 'category', slug)
  return { ok: true }
}

export async function updateCategory(adminId: string, id: string, nameEn: string): Promise<R> {
  if (!nameEn.trim()) return { error: 'Name is required.' }
  await db.category.update({ where: { id }, data: { nameEn: nameEn.trim() } })
  await logAudit(adminId, 'category_update', 'category', id)
  return { ok: true }
}

export async function toggleCategory(adminId: string, id: string, isActive: boolean): Promise<R> {
  await db.category.update({ where: { id }, data: { isActive } })
  await logAudit(adminId, isActive ? 'category_show' : 'category_hide', 'category', id)
  return { ok: true }
}

export async function moveCategory(adminId: string, id: string, dir: 'up' | 'down'): Promise<R> {
  const all = await db.category.findMany({ orderBy: { position: 'asc' }, select: { id: true, position: true, parentId: true } })
  const me = all.find((c) => c.id === id)
  if (!me) return { error: 'Category not found.' }
  const siblings = all.filter((c) => c.parentId === me.parentId)
  const idx = siblings.findIndex((c) => c.id === id)
  const swapWith = dir === 'up' ? siblings[idx - 1] : siblings[idx + 1]
  if (!swapWith) return { ok: true }
  await db.$transaction([
    db.category.update({ where: { id: me.id }, data: { position: swapWith.position } }),
    db.category.update({ where: { id: swapWith.id }, data: { position: me.position } }),
  ])
  await logAudit(adminId, 'category_reorder', 'category', id, { dir })
  return { ok: true }
}

export async function updateSettings(
  adminId: string,
  patch: {
    marketplace_name?: string
    contact_email?: string
    support_email?: string
    terms_url?: string
    privacy_url?: string
    maintenance_mode?: boolean
  },
): Promise<R> {
  const data: Prisma.MarketplaceSettingUpdateInput = {}
  if (patch.marketplace_name !== undefined) data.marketplaceName = patch.marketplace_name
  if (patch.contact_email !== undefined) data.contactEmail = patch.contact_email
  if (patch.support_email !== undefined) data.supportEmail = patch.support_email
  if (patch.terms_url !== undefined) data.termsUrl = patch.terms_url
  if (patch.privacy_url !== undefined) data.privacyUrl = patch.privacy_url
  if (patch.maintenance_mode !== undefined) data.maintenanceMode = patch.maintenance_mode
  await db.marketplaceSetting.update({ where: { id: 'global' }, data })
  await logAudit(adminId, 'settings_update', 'settings', 'global', patch)
  return { ok: true }
}
