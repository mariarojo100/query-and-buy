import { createServiceClient } from '@/utils/supabase/admin'

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
    const admin = createServiceClient()
    await admin.from('search_log').insert({ query: q, user_id: userId ?? null })
  } catch {
    /* logging is best-effort */
  }
}

/** Most frequent searches over the last 7 days — computed, never hardcoded. */
export async function getTrendingSearches(limit = 8): Promise<TrendingSearch[]> {
  let admin
  try {
    admin = createServiceClient()
  } catch {
    return []
  }
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { data } = await admin
    .from('search_log')
    .select('query')
    .gte('created_at', since)
    .limit(5000)

  const counts = new Map<string, { display: string; n: number }>()
  for (const r of (data ?? []) as { query: string }[]) {
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
  let admin
  try {
    admin = createServiceClient()
  } catch {
    return []
  }
  const like = `%${p}%`
  const [{ data: cats }, { data: listings }, trending] = await Promise.all([
    admin.from('categories').select('slug, name_en').eq('is_active', true).ilike('name_en', like).limit(3),
    admin
      .from('listings')
      .select('id, title_en')
      .eq('status', 'active')
      .is('deleted_at', null)
      .ilike('title_en', like)
      .limit(5),
    getTrendingSearches(20),
  ])

  const out: Suggestion[] = []
  const lower = p.toLowerCase()
  const seen = new Set<string>()
  for (const t of trending) {
    if (t.query.toLowerCase().includes(lower) && !seen.has(t.query.toLowerCase())) {
      seen.add(t.query.toLowerCase())
      out.push({ type: 'query', label: t.query })
    }
  }
  for (const c of (cats ?? []) as { slug: string; name_en: string }[])
    out.push({ type: 'category', label: c.name_en, slug: c.slug })
  for (const l of (listings ?? []) as { id: string; title_en: string }[])
    out.push({ type: 'listing', label: l.title_en, id: l.id })

  return out.slice(0, 10)
}
