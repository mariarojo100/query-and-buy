'use server'

/**
 * Sell — thin web wrapper over the shared listing-write service. Every rule
 * (verification gates, validation, safety + contact screens, facet coercion,
 * analytics) lives in lib/listings/write.ts so the mobile API
 * (/api/v1/listings/create) enforces exactly the same behavior.
 */
import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { createListingAs, type ListingWriteInput } from '@/lib/listings/write'

export type { ListingImageInput } from '@/lib/db/listings'
export type CreateListingInput = ListingWriteInput

export async function createListing(input: CreateListingInput): Promise<{
  id?: string
  error?: string
  blocked?: boolean
  needVerify?: boolean
  needPhoneVerify?: boolean
  categories?: string[]
}> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in to sell.' }
  const res = await createListingAs(viewer, input)
  if (res.id) revalidatePath('/')
  return res
}
