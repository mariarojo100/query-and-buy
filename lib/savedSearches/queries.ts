import { createClient } from '@/utils/supabase/server'
import type { SavedFilters } from '@/lib/savedSearches/filters'

export type SavedSearch = {
  id: string
  label: string | null
  query_text: string | null
  parsed_filters: SavedFilters
  created_at: string
}

/** The current user's saved searches, newest first. RLS scopes to owner. */
export async function getUserSavedSearches(): Promise<SavedSearch[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('saved_searches')
    .select('id, label, query_text, parsed_filters, created_at')
    .order('created_at', { ascending: false })

  return (data ?? []) as SavedSearch[]
}
