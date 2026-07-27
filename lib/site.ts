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

/**
 * Default social-share image (the brand card from app/opengraph-image.tsx).
 * Next auto-injects this on routes that DON'T set their own `openGraph`, but a
 * page whose generateMetadata returns an `openGraph` object (category, city)
 * overrides the parent and drops the inherited image — those pages reference
 * this explicitly so og:image is never missing.
 */
export const OG_IMAGE = absoluteUrl('/opengraph-image')
