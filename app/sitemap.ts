import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'
import { sitemapData } from '@/lib/db/sitemap'
import { CITY_SLUGS } from '@/lib/profile/emirates'
import { listingSlug } from '@/lib/listings/slug'

// Revalidate the sitemap hourly so new listings/categories get indexed.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: absoluteUrl('/login'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const { categorySlugs, listings, profiles } = await sitemapData()

    for (const slug of categorySlugs) {
      entries.push({ url: absoluteUrl(`/category/${slug}`), lastModified: now, changeFrequency: 'daily', priority: 0.7 })

      // Category-in-city landing pages (one per emirate) — the long-tail
      // "{category} for sale in {city}" surface. Slightly lower priority than
      // the parent category.
      for (const city of CITY_SLUGS)
        entries.push({ url: absoluteUrl(`/category/${slug}/${city}`), lastModified: now, changeFrequency: 'daily', priority: 0.6 })
    }

    for (const l of listings)
      entries.push({ url: absoluteUrl(`/listing/${listingSlug(l.title, l.id)}`), lastModified: l.lastModified, changeFrequency: 'weekly', priority: 0.8 })

    for (const p of profiles)
      entries.push({ url: absoluteUrl(`/u/${p.username}`), lastModified: p.lastModified, changeFrequency: 'weekly', priority: 0.5 })
  } catch {
    /* DB unavailable at build → ship the static entries only */
  }

  return entries
}
