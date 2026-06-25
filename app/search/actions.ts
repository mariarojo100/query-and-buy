'use server'

import { createClient } from '@/utils/supabase/server'
import { getProvider } from '@/lib/ai/provider'
import { EMIRATES, EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import type { SavedFilters } from '@/lib/savedSearches/filters'

export type ConversationalResult = {
  query: string | null
  filters: SavedFilters
  /** true if Gemini produced usable structured filters; false → keyword fallback. */
  aiUsed: boolean
}

/**
 * Parse a plain-English query into validated search filters. Never throws — if
 * the AI fails or returns nothing usable, falls back to a keyword search on the
 * raw text (req 7). Output maps directly onto the existing 4C URL filters.
 */
export async function parseConversationalSearch(text: string): Promise<ConversationalResult> {
  const raw = text.trim()
  if (!raw) return { query: null, filters: {}, aiUsed: false }

  const fallback: ConversationalResult = { query: raw, filters: {}, aiUsed: false }

  const supabase = await createClient()
  const { data: cats } = await supabase
    .from('categories')
    .select('slug, name_en')
    .eq('is_active', true)
  const categories = ((cats ?? []) as { slug: string; name_en: string }[]).map((c) => ({
    slug: c.slug,
    name: c.name_en,
  }))

  let parsed
  try {
    parsed = await getProvider().parseSearchQuery(raw, {
      categories,
      emirates: EMIRATES.map((e) => ({ value: e.value, label: e.label })),
      conditions: [...CONDITION_VALUES],
    })
  } catch {
    return fallback
  }

  const slugs = new Set(categories.map((c) => c.slug))
  const aed = (n: unknown): string | undefined =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 ? String(Math.round(n)) : undefined

  const filters: SavedFilters = {}
  if (parsed.category_slug && slugs.has(parsed.category_slug)) filters.category = parsed.category_slug
  if (parsed.emirate && EMIRATE_VALUES.includes(parsed.emirate)) filters.emirate = parsed.emirate
  if (parsed.condition && CONDITION_VALUES.includes(parsed.condition))
    filters.condition = parsed.condition
  const min = aed(parsed.min_price_aed)
  if (min) filters.min = min
  const max = aed(parsed.max_price_aed)
  if (max) filters.max = max
  if (parsed.sort === 'price_asc' || parsed.sort === 'price_desc' || parsed.sort === 'newest')
    filters.sort = parsed.sort

  const query = parsed.query?.trim() ? parsed.query.trim() : null

  // Nothing usable came back → keyword search on the original text.
  if (!query && Object.keys(filters).length === 0) return fallback

  return { query, filters, aiUsed: true }
}
