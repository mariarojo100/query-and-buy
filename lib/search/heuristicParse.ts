import type { SavedFilters } from '@/lib/savedSearches/filters'

/**
 * Deterministic natural-language → filters parser. Used as the fallback when
 * the AI parser is unavailable / rate-limited (e.g. Gemini 429) so conversational
 * search still extracts price, emirate, and condition instead of dumping the
 * whole sentence into full-text search. No network, never throws.
 */

const EMIRATE_ALIASES: { value: string; patterns: string[] }[] = [
  { value: 'dubai', patterns: ['dubai'] },
  { value: 'abu_dhabi', patterns: ['abu dhabi', 'abudhabi', 'abu-dhabi'] },
  { value: 'sharjah', patterns: ['sharjah'] },
  { value: 'ajman', patterns: ['ajman'] },
  { value: 'umm_al_quwain', patterns: ['umm al quwain', 'umm al-quwain', 'uaq'] },
  { value: 'ras_al_khaimah', patterns: ['ras al khaimah', 'ras al-khaimah', 'rak'] },
  { value: 'fujairah', patterns: ['fujairah'] },
]

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** "2000" | "2,000" | "2k" | "1.5k" | "50k" → integer AED. */
function parseAmount(s: string): number | null {
  let m = s.replace(/,/g, '').trim().toLowerCase()
  const k = m.endsWith('k')
  if (k) m = m.slice(0, -1)
  const n = parseFloat(m)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(k ? n * 1000 : n)
}

const CURRENCY = '(?:aed\\s*|dhs?\\s*|dirhams?\\s*)?'
const NUM = '([\\d.,]+k?)'

export function heuristicParse(raw: string): { query: string | null; filters: SavedFilters } {
  const text = ` ${raw.toLowerCase()} `
  const filters: SavedFilters = {}
  const stripped: string[] = [] // substrings to remove from the keyword query

  // ----- price -----
  const between = text.match(
    new RegExp(`\\bbetween\\s+${CURRENCY}${NUM}\\s+(?:and|to|-)\\s+${CURRENCY}${NUM}`),
  )
  if (between) {
    const lo = parseAmount(between[1])
    const hi = parseAmount(between[2])
    if (lo) filters.min = String(lo)
    if (hi) filters.max = String(hi)
    stripped.push(between[0])
  } else {
    const max = text.match(
      new RegExp(`\\b(?:under|below|less than|up to|max(?:imum)?|cheaper than|within)\\s+${CURRENCY}${NUM}`),
    )
    if (max) {
      const v = parseAmount(max[1])
      if (v) {
        filters.max = String(v)
        stripped.push(max[0])
      }
    }
    const min = text.match(
      new RegExp(`\\b(?:over|above|more than|from|at least|min(?:imum)?|starting (?:at|from))\\s+${CURRENCY}${NUM}`),
    )
    if (min) {
      const v = parseAmount(min[1])
      if (v) {
        filters.min = String(v)
        stripped.push(min[0])
      }
    }
  }

  // ----- emirate -----
  for (const e of EMIRATE_ALIASES) {
    const hit = e.patterns.find((p) => text.includes(` ${p} `) || text.endsWith(` ${p} `))
    if (hit) {
      filters.emirate = e.value
      stripped.push(hit)
      break
    }
  }

  // ----- condition -----
  if (/\blike[\s-]new\b/.test(text)) {
    filters.condition = 'like_new'
    stripped.push('like new', 'like-new')
  } else if (/\b(?:used|second[\s-]?hand|pre[\s-]?owned|preowned)\b/.test(text)) {
    filters.condition = 'used'
    stripped.push('used', 'second hand', 'second-hand', 'pre owned', 'pre-owned', 'preowned')
  } else if (/\bbrand[\s-]new\b/.test(text)) {
    filters.condition = 'new'
    stripped.push('brand new', 'brand-new')
  } else if (/\bfor parts\b/.test(text)) {
    filters.condition = 'for_parts'
    stripped.push('for parts')
  }

  // ----- cleaned keyword query (keep model numbers like "iPhone 14") -----
  let q = ` ${raw} `
  for (const s of stripped) q = q.replace(new RegExp(esc(s), 'ig'), ' ')
  q = q
    .replace(/\b(?:aed|dhs|dhrs|dirhams?)\b/gi, ' ')
    .replace(/\b(?:in|near|around|located|based)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return { query: q.length >= 2 ? q : null, filters }
}
