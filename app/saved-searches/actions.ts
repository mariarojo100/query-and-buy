'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import {
  createSavedSearchFor,
  deleteSavedSearchFor,
  renameSavedSearchFor,
  setSavedSearchNotifyFor,
} from '@/lib/db/savedSearches'
import type { SavedFilters } from '@/lib/savedSearches/filters'

/** Save the current search (query + filters) for the user. */
export async function saveSearch(input: {
  label: string
  query: string
  filters: SavedFilters
}): Promise<{ ok?: boolean; needAuth?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { needAuth: true }

  const label = input.label.trim()
  if (!label) return { error: 'Give your search a name.' }
  if (label.length > 80) return { error: 'Name is too long.' }

  // Drop empty values so parsed_filters stays clean.
  const filters: SavedFilters = {}
  for (const [k, v] of Object.entries(input.filters)) {
    if (v) filters[k as keyof SavedFilters] = v
  }

  try {
    await createSavedSearchFor(viewer, {
      label,
      queryText: input.query.trim() || null,
      parsedFilters: filters,
      notify: false, // notifications are out of scope
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save search.' }
  }

  revalidatePath('/saved-searches')
  return { ok: true }
}

/** Delete one of the user's saved searches (owner-scoped). */
export async function deleteSavedSearch(id: string): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  await deleteSavedSearchFor(viewer, id)
  revalidatePath('/saved-searches')
  revalidatePath('/account/saved')
  return { ok: true }
}

/** Rename a saved search (owner-scoped). */
export async function renameSavedSearch(id: string, label: string): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  const name = label.trim()
  if (!name) return { error: 'Name cannot be empty.' }
  if (name.length > 80) return { error: 'Name is too long.' }
  await renameSavedSearchFor(viewer, id, name)
  revalidatePath('/saved-searches')
  revalidatePath('/account/saved')
  return { ok: true }
}

/** Enable/disable alerts for a saved search (owner-scoped). */
export async function setSavedSearchAlerts(id: string, notify: boolean): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  await setSavedSearchNotifyFor(viewer, id, notify)
  revalidatePath('/saved-searches')
  revalidatePath('/account/saved')
  return { ok: true }
}
