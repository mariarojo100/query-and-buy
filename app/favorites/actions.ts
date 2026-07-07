'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { toggleFavoriteFor } from '@/lib/db/favorites'

/** Toggle a favorite for the current user (scoped to the viewer in the repository). */
export async function toggleFavorite(
  listingId: string,
): Promise<{ favorited?: boolean; needAuth?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { needAuth: true }
  try {
    const { favorited } = await toggleFavoriteFor(viewer, listingId)
    revalidatePath('/favorites')
    return { favorited }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not update favorite.' }
  }
}
