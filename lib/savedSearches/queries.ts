import { getViewer } from '@/lib/auth/session'
import { savedSearchesFor, type SavedSearch } from '@/lib/db/savedSearches'

export type { SavedSearch }

/** The current user's saved searches, newest first (owner-scoped). */
export async function getUserSavedSearches(): Promise<SavedSearch[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return savedSearchesFor(viewer)
}
