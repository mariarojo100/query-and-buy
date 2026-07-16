'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { createListingAs, type ListingWriteInput } from '@/lib/listings/write'

export type { ListingImageInput } from '@/lib/db/listings'

export type CreateListingInput = ListingWriteInput

/**
 * Create a listing — thin wrapper over lib/listings/write.ts (shared with the
 * mobile API): validation, the pre-write safety screen, moderation logging,
 * and analytics all live in the service.
 */
export async function createListing(
  input: CreateListingInput,
): Promise<{
  id?: string
  error?: string
  blocked?: boolean
  categories?: string[]
  needsPhoneVerification?: boolean
}> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in to sell.' }

  const res = await createListingAs(viewer, input)
  if (res.error) {
    return {
      error: res.error,
      blocked: res.blocked,
      categories: res.categories,
      needsPhoneVerification: res.needsPhoneVerification,
    }
  }

  revalidatePath('/')
  return { id: res.id }
}
