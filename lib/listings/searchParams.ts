import type { SortKey } from '@/lib/listings/queries'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'

export type RawSearchParams = { [key: string]: string | string[] | undefined }

export type ParsedSearch = {
  q?: string
  categorySlug?: string
  emirate?: string
  condition?: string
  minFils?: number
  maxFils?: number
  negotiable?: boolean
  featured?: boolean
  sinceDays?: number
  sort: SortKey
}

const VALID_SORTS: SortKey[] = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'most_viewed',
  'recently_updated',
  'featured_first',
]

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s && s.trim() ? s.trim() : undefined
}

function fils(v: string | string[] | undefined): number | undefined {
  const n = Number(str(v))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined
}

/** Parse + validate URL query params into listing filters (ignores junk values). */
export function parseSearch(sp: RawSearchParams): ParsedSearch {
  const emirate = str(sp.emirate)
  const condition = str(sp.condition)
  const sort = str(sp.sort) as SortKey | undefined
  const since = Number(str(sp.since))
  return {
    q: str(sp.q),
    categorySlug: str(sp.category),
    emirate: emirate && EMIRATE_VALUES.includes(emirate) ? emirate : undefined,
    condition: condition && CONDITION_VALUES.includes(condition) ? condition : undefined,
    minFils: fils(sp.min),
    maxFils: fils(sp.max),
    negotiable: str(sp.negotiable) === '1' ? true : undefined,
    featured: str(sp.featured) === '1' ? true : undefined,
    sinceDays: [1, 7, 30].includes(since) ? since : undefined,
    sort: sort && VALID_SORTS.includes(sort) ? sort : 'newest',
  }
}
