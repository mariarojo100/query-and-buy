/** Canonical site metadata, shared by SEO, sitemap, robots, and JSON-LD. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export const SITE_NAME = 'Query & Buy'

export const SITE_DESCRIPTION =
  'Snap. Sell. Done. Create listings from photos in seconds and buy & sell across the UAE.'

/** Absolute URL for a path (for canonicals, OG, sitemap, JSON-LD). */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
