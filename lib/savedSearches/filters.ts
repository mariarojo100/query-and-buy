import { emirateLabel } from '@/lib/profile/emirates'
import { conditionLabel } from '@/lib/listings/conditions'

/** The filter shape stored in saved_searches.parsed_filters (URL-aligned). */
export type SavedFilters = {
  category?: string // slug
  emirate?: string
  condition?: string
  min?: string // AED
  max?: string // AED
  sort?: string
}

const SORT_LABELS: Record<string, string> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
}

/** Build the search-results URL that re-applies a saved search. */
export function buildSearchHref(query: string | null | undefined, f: SavedFilters): string {
  const p = new URLSearchParams()
  if (query) p.set('q', query)
  if (f.category) p.set('category', f.category)
  if (f.emirate) p.set('emirate', f.emirate)
  if (f.condition) p.set('condition', f.condition)
  if (f.min) p.set('min', f.min)
  if (f.max) p.set('max', f.max)
  if (f.sort && f.sort !== 'newest') p.set('sort', f.sort)
  const qs = p.toString()
  return qs ? `/?${qs}` : '/'
}

function priceChip(min?: string, max?: string): string | null {
  if (min && max) return `AED ${min}–${max}`
  if (min) return `From AED ${min}`
  if (max) return `Up to AED ${max}`
  return null
}

/** Human-readable chips summarising a saved search. */
export function describeSearch(
  query: string | null | undefined,
  f: SavedFilters,
  categoryName?: string | null,
): string[] {
  const chips: string[] = []
  if (query) chips.push(`“${query}”`)
  if (f.category) chips.push(categoryName ?? f.category)
  if (f.emirate) chips.push(emirateLabel(f.emirate) ?? f.emirate)
  if (f.condition) chips.push(conditionLabel(f.condition) ?? f.condition)
  const price = priceChip(f.min, f.max)
  if (price) chips.push(price)
  if (f.sort && f.sort !== 'newest') chips.push(SORT_LABELS[f.sort] ?? f.sort)
  if (chips.length === 0) chips.push('All listings')
  return chips
}
