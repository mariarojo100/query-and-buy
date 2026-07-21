/**
 * Listing URL slugs.
 *
 * Listing URLs are `/listing/{title-slug}-{uuid}` — the slug carries keywords
 * for SEO, the trailing UUID is the real lookup key (titles aren't unique and
 * can change). The detail route extracts the UUID from the end of the param and
 * 301-redirects any non-canonical form (bare UUID, stale slug after an edit) to
 * the canonical slug, so old `/listing/{uuid}` links keep working.
 */

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const TRAILING_UUID = new RegExp(`${UUID}$`)

/** Turn a listing title into a URL-safe slug (lowercase, hyphenated, ≤60 chars). */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, '') // trim hyphens
    .slice(0, 60)
    .replace(/-+$/, '') // avoid a trailing hyphen after the slice
}

/** Canonical slug for a listing: "{title-slug}-{uuid}" (falls back to the raw id). */
export function listingSlug(title: string, id: string): string {
  const s = slugifyTitle(title)
  return s ? `${s}-${id}` : id
}

/** Canonical path for a listing detail page. */
export function listingPath(title: string, id: string): string {
  return `/listing/${listingSlug(title, id)}`
}

/**
 * Pull the listing UUID out of a route param, whether it's a full slug
 * ("lenovo-thinkpad-…-<uuid>") or a bare UUID. Returns null if none is present.
 */
export function extractListingId(param: string): string | null {
  const m = param.match(TRAILING_UUID)
  return m ? m[0].toLowerCase() : null
}
