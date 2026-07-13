/**
 * @qb/shared constants — the single source for enum values and money helpers
 * shared by the web app, the /api/v1 layer, and the mobile app.
 *
 * Values MUST match the Postgres enums (db/baseline/0001_schema.sql) and the
 * web sources they mirror (lib/profile/emirates.ts, lib/listings/conditions.ts,
 * lib/format.ts). The drift guard in types/shared-contract-check.ts fails the
 * web typecheck if these diverge.
 */

/** The 7 UAE emirates — values match the Postgres `emirate` enum. */
export const EMIRATES = [
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu_dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'ajman', label: 'Ajman' },
  { value: 'umm_al_quwain', label: 'Umm Al Quwain' },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { value: 'fujairah', label: 'Fujairah' },
] as const

export type Emirate = (typeof EMIRATES)[number]['value']
export const EMIRATE_VALUES = EMIRATES.map((e) => e.value) as readonly Emirate[]

/** listing_condition enum → display labels. */
export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'used', label: 'Used' },
  { value: 'for_parts', label: 'For parts' },
] as const

export type Condition = (typeof CONDITIONS)[number]['value']
export const CONDITION_VALUES = CONDITIONS.map((c) => c.value) as readonly Condition[]

/** Listing feed sort keys — mirror lib/listings/searchParams.ts VALID_SORTS. */
export const SORT_VALUES = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'most_viewed',
  'recently_updated',
  'featured_first',
] as const

export type SortKey = (typeof SORT_VALUES)[number]

/** Order lifecycle states — mirror lib/db/orders.ts OrderStatus. */
export const ORDER_STATUS_VALUES = [
  'negotiating',
  'offer_sent',
  'offer_accepted',
  'awaiting_confirmation',
  'confirmed',
  'cancelled',
  'completed',
] as const

/** Offer states — mirror lib/db/orders.ts OfferStatus. */
export const OFFER_STATUS_VALUES = ['pending', 'accepted', 'declined', 'countered', 'superseded'] as const

/** Format a money amount stored as fils (1 AED = 100 fils) for display. */
export function formatPrice(fils: number, currency = 'AED'): string {
  const amount = fils / 100
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
  return `${currency} ${formatted}`
}

/** Parse an AED string/number into integer fils. Returns null if invalid. */
export function aedToFils(input: string | number): number | null {
  const aed = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(aed) || aed < 0) return null
  return Math.round(aed * 100)
}

/** Fils → whole AED number (for form defaults; display should use formatPrice). */
export function filsToAed(fils: number): number {
  return fils / 100
}

/** Upload limits — mirror lib/object-storage/keys.ts validateUpload rules. */
export const UPLOAD_LIMITS = {
  avatar: { maxBytes: 2 * 1024 * 1024, label: '2 MB' },
  listingImage: { maxBytes: 5 * 1024 * 1024, label: '5 MB' },
  maxListingImages: 8,
} as const

export const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
