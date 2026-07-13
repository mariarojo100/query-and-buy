import { getViewer } from '@/lib/auth/session'
import { favoritedIdsFor, favoritesFeedFor } from '@/lib/db/favorites'
import type { FeedListing } from '@/lib/listings/queries'

/** Which of the given listing ids the current user has favorited (empty if logged out). */
export async function getFavoritedIds(listingIds: string[]): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set()
  const viewer = await getViewer()
  if (!viewer) return new Set()
  return favoritedIdsFor(viewer, listingIds)
}

/** The current user's favorited listings that are still active, newest-saved first. */
export async function getUserFavorites(): Promise<FeedListing[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return favoritesFeedFor(viewer)
}
