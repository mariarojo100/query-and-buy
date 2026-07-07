import {
  insertSearchLog,
  recentSearchQueries,
  categorySuggestions,
  listingTitleSuggestions,
} from '@/lib/db/system/search'

export type TrendingSearch = { query: string; count: number }

export type Suggestion =
  | { type: 'query'; label: string }
  | { type: 'category'; label: string; slug: string }
  | { type: 'listing'; label: string; id: string }

/** Record a search query for trending/suggestions. Best-effort, never throws. */
export async function logSearch(query: string, userId?: string | null): Promise<void> {
  const q = query.trim().slice(0, 100)
  if (q.length < 2) return
  try {
    await insertSearchLog(q, userId ?? null)
  } catch {
    /* logging is best-effort */
  }
}

/** Most frequent searches over the last 7 days — computed, never hardcoded. */
export async function getTrendingSearches(limit = 8): Promise<TrendingSearch[]> {
  let rows: { query: string }[]
  try {
    rows = await recentSearchQueries(7, 5000)
  } catch {
    return []
  }
  const counts = new Map<string, { display: string; n: number }>()
  for (const r of rows) {
    const key = r.query.toLowerCase().trim()
    if (key.length < 2) continue
    const e = counts.get(key) ?? { display: r.query.trim(), n: 0 }
    e.n += 1
    counts.set(key, e)
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((e) => ({ query: e.display, count: e.n }))
}

/** Typeahead suggestions combining trending queries, categories, and live listings. */
export async function getSearchSuggestions(prefix: string): Promise<Suggestion[]> {
  const p = prefix.trim()
  if (p.length < 2) return []

  let cats: { slug: string; name_en: string }[]
  let listings: { id: string; title_en: string }[]
  let trending: TrendingSearch[]
  try {
    ;[cats, listings, trending] = await Promise.all([
      categorySuggestions(p, 3),
      listingTitleSuggestions(p, 5),
      getTrendingSearches(20),
    ])
  } catch {
    return []
  }

  const out: Suggestion[] = []
  const lower = p.toLowerCase()
  const seen = new Set<string>()
  for (const t of trending) {
    if (t.query.toLowerCase().includes(lower) && !seen.has(t.query.toLowerCase())) {
      seen.add(t.query.toLowerCase())
      out.push({ type: 'query', label: t.query })
    }
  }
  for (const c of cats) out.push({ type: 'category', label: c.name_en, slug: c.slug })
  for (const l of listings) out.push({ type: 'listing', label: l.title_en, id: l.id })

  return out.slice(0, 10)
}
