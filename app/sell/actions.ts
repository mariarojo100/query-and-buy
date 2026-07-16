'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { emailUnverified, phoneUnverified } from '@/lib/authz/require-verified'
import { createListingFor } from '@/lib/db/listings'
import { aedToFils } from '@/lib/format'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import { logModeration } from '@/lib/safety/moderation-log'
import { track } from '@/lib/analytics'

export type { ListingImageInput } from '@/lib/db/listings'
import type { ListingImageInput } from '@/lib/db/listings'

export type CreateListingInput = {
  title: string
  description: string
  priceAed: number
  category_id: string
  condition: string
  emirate: string
  area?: string
  isNegotiable?: boolean
  images: ListingImageInput[]
}

export async function createListing(
  input: CreateListingInput,
): Promise<{
  id?: string
  error?: string
  blocked?: boolean
  needVerify?: boolean
  needPhoneVerify?: boolean
  categories?: string[]
}> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in to sell.' }
  const gate = emailUnverified(viewer)
  if (gate) return gate
  const phoneGate = await phoneUnverified(viewer)
  if (phoneGate) return phoneGate

  const title = input.title?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  const area = input.area?.trim() || null

  // --- validation ---
  if (title.length < 3 || title.length > 100) {
    return { error: 'Title must be 3–100 characters.' }
  }
  if (description.length < 10 || description.length > 2000) {
    return { error: 'Description must be 10–2000 characters.' }
  }
  const price_fils = aedToFils(input.priceAed)
  if (price_fils === null) return { error: 'Enter a valid price.' }
  if (!input.category_id) return { error: 'Choose a category.' }
  if (!EMIRATE_VALUES.includes(input.emirate)) return { error: 'Choose an emirate.' }
  if (!CONDITION_VALUES.includes(input.condition)) return { error: 'Choose a condition.' }
  if (!input.images?.length) return { error: 'Add at least one photo.' }
  if (input.images.length > 8) return { error: 'Up to 8 photos.' }

  // --- safety screen (BEFORE any DB write) ---
  const safety = analyzeListingSafety(title, description)
  if (!safety.safe) {
    await logModeration({
      source: 'listing',
      decision: 'blocked',
      confidence: 100,
      reason: `Prohibited content: ${safety.categories.join(', ')}`,
    })
    return { blocked: true, error: PROHIBITED_MESSAGE, categories: safety.categories }
  }

  const res = await createListingFor(viewer, {
    title,
    description,
    priceFils: price_fils,
    categoryId: input.category_id,
    condition: input.condition,
    emirate: input.emirate,
    area,
    isNegotiable: input.isNegotiable ?? true,
    images: input.images,
  })
  if (res.error) return { error: res.error }

  track('listing_created', { listingId: res.id, category_id: input.category_id })
  revalidatePath('/')
  return { id: res.id }
}
