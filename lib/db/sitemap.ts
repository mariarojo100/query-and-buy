/**
 * lib/db/sitemap — data for the XML sitemap (Phase 4). Public reads; runs at
 * build/ISR time (no request scope), so it takes no Viewer.
 */
import { db } from '@/lib/db'

export type SitemapData = {
  categorySlugs: string[]
  listings: { id: string; lastModified: Date }[]
  profiles: { username: string; lastModified: Date }[]
}

export async function sitemapData(): Promise<SitemapData> {
  const [cats, listings, profiles] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    db.listing.findMany({
      where: { status: 'active', deletedAt: null },
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      take: 5000,
      select: { id: true, publishedAt: true, updatedAt: true },
    }),
    db.profile.findMany({ where: { username: { not: null } }, take: 5000, select: { username: true, updatedAt: true } }),
  ])
  return {
    categorySlugs: cats.map((c) => c.slug),
    listings: listings.map((l) => ({ id: l.id, lastModified: l.updatedAt ?? l.publishedAt ?? new Date() })),
    profiles: profiles
      .filter((p): p is { username: string; updatedAt: Date } => p.username != null)
      .map((p) => ({ username: p.username, lastModified: p.updatedAt })),
  }
}
