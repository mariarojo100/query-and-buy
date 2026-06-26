'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { SavedFilters } from '@/lib/savedSearches/filters'

/** Save the current search (query + filters) for the user. */
export async function saveSearch(input: {
  label: string
  query: string
  filters: SavedFilters
}): Promise<{ ok?: boolean; needAuth?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needAuth: true }

  const label = input.label.trim()
  if (!label) return { error: 'Give your search a name.' }
  if (label.length > 80) return { error: 'Name is too long.' }

  // Drop empty values so parsed_filters stays clean.
  const filters: SavedFilters = {}
  for (const [k, v] of Object.entries(input.filters)) {
    if (v) filters[k as keyof SavedFilters] = v
  }

  const { error } = await supabase.from('saved_searches').insert({
    user_id: user.id,
    label,
    query_text: input.query.trim() || null,
    parsed_filters: filters,
    notify: false, // notifications are out of scope
  })
  if (error) return { error: error.message }

  revalidatePath('/saved-searches')
  return { ok: true }
}

/** Delete one of the user's saved searches. RLS scopes to owner. */
export async function deleteSavedSearch(id: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/saved-searches')
  revalidatePath('/account/saved')
  return { ok: true }
}

/** Rename a saved search. RLS scopes to owner. */
export async function renameSavedSearch(
  id: string,
  label: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }
  const name = label.trim()
  if (!name) return { error: 'Name cannot be empty.' }
  if (name.length > 80) return { error: 'Name is too long.' }

  const { error } = await supabase
    .from('saved_searches')
    .update({ label: name })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/saved-searches')
  revalidatePath('/account/saved')
  return { ok: true }
}

/** Enable/disable alerts for a saved search (stores the flag; delivery is future work). */
export async function setSavedSearchAlerts(
  id: string,
  notify: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('saved_searches')
    .update({ notify })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/saved-searches')
  revalidatePath('/account/saved')
  return { ok: true }
}
