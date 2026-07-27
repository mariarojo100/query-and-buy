/**
 * Listing URL slugs.
 *
 * Listing URLs are `/listing/{title-slug}-{publicId}` — the slug carries
 * keywords for SEO, the trailing short `publicId` (12 hex chars) is the lookup
 * key (titles aren't unique and can change). The detail route resolves the
 * trailing token and 301-redirects any non-canonical form to the canonical
 * slug. Legacy `/listing/{uuid}` (or `{slug}-{uuid}`) links still resolve — the
 * route detects a trailing UUID, looks the listing up by id, and redirects to
 * the canonical publicId slug — so old links and search-index entries carry over.
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
 * Still used by the owner-only edit route, which is linked by bare UUID.
 */
export function extractListingId(param: string): string | null {
  const m = param.match(TRAILING_UUID)
  return m ? m[0].toLowerCase() : null
}

/**
 * Resolve the trailing lookup key from a listing route param. A trailing UUID
 * means a legacy URL (look up by id, then redirect to the canonical publicId
 * slug); otherwise the last hyphen-delimited token is the short publicId.
 */
export function extractListingRef(param: string): { kind: 'uuid' | 'publicId'; value: string } {
  const uuid = param.match(TRAILING_UUID)
  if (uuid) return { kind: 'uuid', value: uuid[0].toLowerCase() }
  const lastHyphen = param.lastIndexOf('-')
  return { kind: 'publicId', value: param.slice(lastHyphen + 1).toLowerCase() }
}
