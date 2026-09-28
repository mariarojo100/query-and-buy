/**
 * The agent-facing catalogue: the same public listings a visitor can browse,
 * shaped for AI agents (the structured feed and the MCP endpoint). Read-only.
 * Seller identity beyond a display name is never exposed; buying happens on
 * Query & Buy itself, where the buyer messages the seller in-app.
 */
import {
  activeCategories,
  categoryBySlug,
  categoryCounts,
  filteredListings,
  listingByPublicIdVisible,
  type FeedListing,
  type ListingDetail,
  type SortKey,
} from '@/lib/db/listings'
import { listingSlug } from '@/lib/listings/slug'
import { absoluteUrl } from '@/lib/site'
import { LISTING_IMAGES_BUCKET, publicUrl } from '@/lib/storage'

export const EMIRATES = ['dubai', 'abu_dhabi', 'sharjah', 'ajman', 'umm_al_quwain', 'ras_al_khaimah', 'fujairah'] as const
export const CONDITIONS = ['new', 'like_new', 'used', 'for_parts'] as const
export const SORTS = ['newest', 'price_asc', 'price_desc', 'most_viewed'] as const

const EMIRATE_NAME: Record<string, string> = {
  dubai: 'Dubai',
  abu_dhabi: 'Abu Dhabi',
  sharjah: 'Sharjah',
  ajman: 'Ajman',
  umm_al_quwain: 'Umm Al Quwain',
  ras_al_khaimah: 'Ras Al Khaimah',
  fujairah: 'Fujairah',
}
const CONDITION_NAME: Record<string, string> = { new: 'New', like_new: 'Like new', used: 'Used', for_parts: 'For parts' }

export type AgentListing = {
  id: string
  title: string
  price: { amount: number; currency: string; display: string }
  condition: string
  category: string | null
  location: string | null
  posted: string | null
  url: string
  image: string | null
}

const aed = (fils: number) => Math.round(fils) / 100
const place = (emirate: string | null, area: string | null) =>
  [area, emirate ? EMIRATE_NAME[emirate] ?? emirate : null].filter(Boolean).join(', ') || null

function card(l: FeedListing): AgentListing {
  const amount = aed(l.price_fils)
  return {
    id: l.public_id,
    title: l.title_en,
    price: { amount, currency: l.currency, display: `${l.currency} ${amount.toLocaleString('en-US')}` },
    condition: CONDITION_NAME[l.condition] ?? l.condition,
    category: l.category_slug,
    location: place(l.emirate, l.area),
    posted: l.published_at,
    url: absoluteUrl(`/listing/${listingSlug(l.title_en, l.public_id)}`),
    image: l.cover_key ? publicUrl(LISTING_IMAGES_BUCKET, l.cover_key) : null,
  }
}

export type SearchInput = {
  query?: string
  category?: string
  emirate?: string
  condition?: string
  min_price_aed?: number
  max_price_aed?: number
  sort?: string
  limit?: number
}

export async function searchListings(input: SearchInput): Promise<{ total: number; results: AgentListing[]; browse_url: string }> {
  let categoryIds: string[] | undefined
  if (input.category) {
    const cat = await categoryBySlug(input.category)
    if (!cat) return { total: 0, results: [], browse_url: absoluteUrl('/search') }
    categoryIds = cat.ids
  }
  const emirate = EMIRATES.includes(input.emirate as never) ? input.emirate : undefined
  const condition = CONDITIONS.includes(input.condition as never) ? input.condition : undefined
  const sort = (SORTS.includes(input.sort as never) ? input.sort : 'newest') as SortKey
  const limit = Math.max(1, Math.min(20, Math.round(input.limit ?? 10)))
  const { listings, count } = await filteredListings({
    q: input.query?.slice(0, 120),
    categoryIds,
    emirate,
    condition,
    minFils: typeof input.min_price_aed === 'number' ? Math.round(input.min_price_aed * 100) : undefined,
    maxFils: typeof input.max_price_aed === 'number' ? Math.round(input.max_price_aed * 100) : undefined,
    sort,
    limit,
  })
  const params = new URLSearchParams()
  if (input.query) params.set('q', input.query)
  const browse = input.category ? `/${input.category}` : '/search'
  return { total: count, results: listings.map(card), browse_url: absoluteUrl(`${browse}${params.size ? `?${params}` : ''}`) }
}

export async function getListing(id: string) {
  if (!/^[0-9a-f]{12}$/.test(id)) return null
  const l: ListingDetail | null = await listingByPublicIdVisible(null, id)
  if (!l || l.status !== 'active') return null
  const amount = aed(l.price_fils)
  const url = absoluteUrl(`/listing/${listingSlug(l.title_en, l.public_id)}`)
  return {
    id: l.public_id,
    title: l.title_en,
    description: l.description.slice(0, 4000),
    price: { amount, currency: l.currency, display: `${l.currency} ${amount.toLocaleString('en-US')}`, negotiable: l.is_negotiable },
    condition: CONDITION_NAME[l.condition] ?? l.condition,
    category: l.category_name,
    details: l.attributes,
    location: place(l.emirate, l.area),
    posted: l.published_at,
    seller: l.seller
      ? {
          name: l.seller.display_name,
          member_since: l.seller.member_since,
          email_verified: l.seller.email_verified,
          phone_verified: l.seller.phone_verified,
          active_listings: l.seller.listings_count,
        }
      : null,
    images: [...l.images].sort((a, b) => a.position - b.position).slice(0, 8).map((i) => publicUrl(LISTING_IMAGES_BUCKET, i.storage_key)),
    url,
    how_to_buy:
      'Open the listing URL and press "Chat with seller" (a free Query & Buy account is needed). Chat stays in-app so phone numbers stay private; ' +
      'agree the price with an in-app offer, and contact details are shared only once both sides confirm.',
  }
}

export async function listCategories() {
  const cats = await activeCategories()
  const counts = await categoryCounts(cats)
  return cats
    .filter((c) => !c.parent_id)
    .map((c) => ({ slug: c.slug, name: c.name_en, active_listings: counts.get(c.slug) ?? 0, url: absoluteUrl(`/${c.slug}`) }))
}

/** schema.org Product for the structured feed. */
export function productNode(l: AgentListing) {
  return {
    '@type': 'Product',
    '@id': l.url,
    name: l.title,
    url: l.url,
    ...(l.image ? { image: l.image } : {}),
    ...(l.category ? { category: l.category } : {}),
    offers: {
      '@type': 'Offer',
      price: l.price.amount,
      priceCurrency: l.price.currency,
      availability: 'https://schema.org/InStock',
      url: l.url,
      ...(l.location ? { availableAtOrFrom: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: l.location, addressCountry: 'AE' } } } : {}),
    },
  }
}

/** Newest active listings for the feed (not capped at 20 like agent search). */
export async function listNewest(limit: number): Promise<AgentListing[]> {
  const { listings } = await filteredListings({ sort: 'newest', limit: Math.min(limit, 500) })
  return listings.map(card)
}
