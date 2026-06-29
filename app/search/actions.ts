'use server'

import { createClient } from '@/utils/supabase/server'
import { getProvider } from '@/lib/ai/provider'
import { track } from '@/lib/analytics'
import { logger } from '@/lib/logger'
import { getSearchSuggestions, logSearch, type Suggestion } from '@/lib/search/intelligence'

/** Typeahead suggestions for the smart search box (client-callable). */
export async function getSuggestions(prefix: string): Promise<Suggestion[]> {
  return getSearchSuggestions(prefix)
}
import { EMIRATES, EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import type { SavedFilters } from '@/lib/savedSearches/filters'
import { heuristicParse } from '@/lib/search/heuristicParse'

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
  track('search_performed', { length: raw.length })
  await logSearch(raw)

  // Deterministic fallback: extract price/emirate/condition + clean keywords
  // locally so search still works when the AI is rate-limited (429) or down,
  // instead of dumping the whole sentence into full-text search.
  const heuristic = heuristicParse(raw)
  const fallback: ConversationalResult = {
    query: heuristic.query ?? raw,
    filters: heuristic.filters,
    aiUsed: false,
  }

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
  } catch (e) {
    logger.warn('search.parse', 'AI parse failed, falling back to keyword', {
      reason: e instanceof Error ? e.message : 'unknown',
    })
    return fallback
  }

  const slugs = new Set(categories.map((c) => c.slug))
  const aed = (n: unknown): string | undefined =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 ? String(Math.round(n)) : undefined

  const filters: SavedFilters = {}
  // The retired "Jobs" category maps to the closest valid one.
  const catSlug = parsed.category_slug === 'jobs' ? 'services' : parsed.category_slug
  if (catSlug && slugs.has(catSlug)) filters.category = catSlug
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
