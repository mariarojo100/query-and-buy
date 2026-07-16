'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import {
  markListingSoldFor,
  softDeleteListingFor,
  setListingPausedFor,
  updateListingFor,
  type ListingImageInput,
} from '@/lib/db/listings'
import { getStorageDriver } from '@/lib/object-storage'
import { aedToFils } from '@/lib/format'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import { detectContactInfo, CONTACT_BLOCK_MESSAGE } from '@/lib/safety/contact'

type Result = { ok?: boolean; error?: string; blocked?: boolean; categories?: string[] }

function revalidateListing(id: string) {
  revalidatePath('/account/listings')
  revalidatePath('/')
  revalidatePath(`/listing/${id}`)
}

/** Mark an active listing as sold. Owner-only. */
export async function markSold(id: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  if (!(await markListingSoldFor(viewer, id))) return { error: 'Listing not found.' }
  revalidateListing(id)
  return { ok: true }
}

/** Soft-delete: status='deleted' + deleted_at. Owner-only. */
export async function softDeleteListing(id: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  if (!(await softDeleteListingFor(viewer, id))) return { error: 'Listing not found.' }
  revalidateListing(id)
  return { ok: true }
}

/** Pause (active → draft) or resume (draft → active). Owner-only. */
export async function setListingPaused(id: string, paused: boolean): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  if (!(await setListingPausedFor(viewer, id, paused))) return { error: 'Listing not found.' }
  revalidateListing(id)
  return { ok: true }
}

export type UpdateListingInput = {
  id: string
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

/** Update a listing's fields and replace its image set. Owner-only. */
export async function updateListing(input: UpdateListingInput): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const title = input.title?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  const area = input.area?.trim() || null

  if (title.length < 3 || title.length > 100) return { error: 'Title must be 3–100 characters.' }
  if (description.length < 10 || description.length > 2000) return { error: 'Description must be 10–2000 characters.' }
  const price_fils = aedToFils(input.priceAed)
  if (price_fils === null) return { error: 'Enter a valid price.' }
  if (!EMIRATE_VALUES.includes(input.emirate)) return { error: 'Choose an emirate.' }
  if (!CONDITION_VALUES.includes(input.condition)) return { error: 'Choose a condition.' }
  if (!input.images?.length) return { error: 'Keep at least one photo.' }
  if (input.images.length > 8) return { error: 'Up to 8 photos.' }

  // Re-screen on edit so a safe listing can't be edited into prohibited content.
  const safety = analyzeListingSafety(title, description)
  if (!safety.safe) return { blocked: true, error: PROHIBITED_MESSAGE, categories: safety.categories }

  // Re-screen contact info too (can't edit clean text into contact details).
  if (detectContactInfo(`${title}\n${description}`).blocked) {
    return { blocked: true, error: CONTACT_BLOCK_MESSAGE }
  }

  const res = await updateListingFor(viewer, {
    id: input.id,
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
  if ('error' in res) return { error: res.error }

  // Best-effort: delete orphaned storage objects for removed images.
  if (res.removedKeys.length > 0) {
    try {
      const drv = getStorageDriver()
      await Promise.all(res.removedKeys.map((key) => drv.remove({ bucket: 'listing-images', key })))
    } catch {
      /* storage wiring is Phase 5; orphan cleanup is best-effort */
    }
  }

  revalidateListing(input.id)
  return { ok: true }
}
