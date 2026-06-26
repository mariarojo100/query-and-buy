/**
 * Centralized, deterministic listing safety checks (Sprint 7A Part 5).
 * Keyword/phrase matching only — NO AI moderation. Shared by manual and
 * AI-generated listing flows.
 *
 * Prohibited content is BLOCKED before any insert/update — listings with
 * matches are never saved.
 */

type SafetyCategory = { name: string; keywords: string[] }

const SAFETY_RULES: SafetyCategory[] = [
  { name: 'Weapon', keywords: ['gun', 'pistol', 'rifle', 'shotgun', 'ammunition'] },
  { name: 'Drug', keywords: ['cocaine', 'heroin', 'meth', 'marijuana', 'weed'] },
  {
    name: 'Counterfeit',
    keywords: ['fake rolex', 'replica rolex', 'counterfeit', 'copy watch'],
  },
  { name: 'Adult Service', keywords: ['escort', 'adult service', 'erotic', 'prostitution'] },
]

export type SafetyResult = {
  safe: boolean
  /** Display names of the prohibited categories detected (empty when safe). */
  categories: string[]
  matchedKeywords: string[]
}

/** Shown to users when a listing is blocked. */
export const PROHIBITED_MESSAGE =
  'This item is not allowed on Query & Buy.\n' +
  'Weapons, drugs, counterfeit goods, and illegal services cannot be listed.'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Whole-word/phrase match (case-insensitive) to avoid false positives
 *  like "begun" → "gun" or "method" → "meth". */
function containsKeyword(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(text)
}

/**
 * Scan a listing's title + description for prohibited content.
 * Pure + deterministic — safe to call on both the client (pre-check) and the
 * server (enforcement).
 */
export function analyzeListingSafety(title: string, description: string): SafetyResult {
  const text = `${title ?? ''} ${description ?? ''}`

  const matched: string[] = []
  const categories: string[] = []
  for (const category of SAFETY_RULES) {
    const hits = category.keywords.filter((kw) => containsKeyword(text, kw))
    if (hits.length > 0) {
      matched.push(...hits)
      categories.push(category.name)
    }
  }

  return {
    safe: matched.length === 0,
    categories,
    matchedKeywords: [...new Set(matched)],
  }
}
