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
  sort: SortKey
}

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
  const sort = str(sp.sort)
  return {
    q: str(sp.q),
    categorySlug: str(sp.category),
    emirate: emirate && EMIRATE_VALUES.includes(emirate) ? emirate : undefined,
    condition: condition && CONDITION_VALUES.includes(condition) ? condition : undefined,
    minFils: fils(sp.min),
    maxFils: fils(sp.max),
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest',
  }
}
