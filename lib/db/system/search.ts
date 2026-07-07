/**
 * lib/db/system/search — search_log writes + trending/suggestion reads (Phase 4).
 * search_log is deny-all under RLS (service-role only); a system repo here.
 * The category/listing suggestion reads are public data.
 */
import { db } from '@/lib/db'

export async function insertSearchLog(query: string, userId: string | null): Promise<void> {
  await db.searchLog.create({ data: { query, userId } })
}

export async function recentSearchQueries(sinceDays: number, limit: number): Promise<{ query: string }[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000)
  return db.searchLog.findMany({
    where: { createdAt: { gte: since } },
    select: { query: true },
    take: limit,
  })
}

export async function categorySuggestions(prefix: string, limit: number): Promise<{ slug: string; name_en: string }[]> {
  const rows = await db.category.findMany({
    where: { isActive: true, nameEn: { contains: prefix, mode: 'insensitive' } },
    select: { slug: true, nameEn: true },
    take: limit,
  })
  return rows.map((r) => ({ slug: r.slug, name_en: r.nameEn }))
}

export async function listingTitleSuggestions(prefix: string, limit: number): Promise<{ id: string; title_en: string }[]> {
  const rows = await db.listing.findMany({
    where: { status: 'active', deletedAt: null, titleEn: { contains: prefix, mode: 'insensitive' } },
    select: { id: true, titleEn: true },
    take: limit,
  })
  return rows.map((r) => ({ id: r.id, title_en: r.titleEn }))
}
