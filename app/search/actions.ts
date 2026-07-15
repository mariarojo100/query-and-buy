'use server'

import { getViewer } from '@/lib/auth/session'
import { getSearchSuggestions, type Suggestion } from '@/lib/search/intelligence'
import {
  parseConversationalSearchAs,
  type ConversationalResult,
} from '@/lib/search/parseService'

export type { ConversationalResult }

/** Typeahead suggestions for the smart search box (client-callable). */
export async function getSuggestions(prefix: string): Promise<Suggestion[]> {
  return getSearchSuggestions(prefix)
}

/**
 * Parse a plain-English query into validated search filters — thin wrapper
 * over lib/search/parseService.ts (shared with the mobile API). Never throws;
 * AI failure falls back to the deterministic heuristic parse.
 */
export async function parseConversationalSearch(text: string): Promise<ConversationalResult> {
  const viewer = await getViewer()
  return parseConversationalSearchAs(viewer, text)
}
