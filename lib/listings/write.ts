/**
 * lib/listings/write — create/update listing flows shared by the web actions
 * (app/sell/actions.ts, app/account/listings/actions.ts) and the mobile API.
 * Validation, the safety screen (BEFORE any DB write), moderation logging,
 * analytics, and orphaned-image cleanup live here.
 */
import { createListingFor, updateListingFor, type ListingImageInput } from '@/lib/db/listings'
import { getStorageDriver } from '@/lib/object-storage'
import { aedToFils } from '@/lib/format'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import { logModeration } from '@/lib/safety/moderation-log'
import { track } from '@/lib/analytics'
import { requirePhoneVerified } from '@/lib/authz/verification-guard'
import type { Viewer } from '@/lib/authz/viewer'

export type ListingWriteInput = {
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

export type ListingWriteResult = {
  id?: string
  ok?: boolean
  error?: string
  blocked?: boolean
  categories?: string[]
  /** Set when the write was refused because the seller's phone isn't verified. */
  needsPhoneVerification?: boolean
}

type Validated = {
  title: string
  description: string
  priceFils: number
  area: string | null
}

function validate(input: ListingWriteInput, mode: 'create' | 'update'): Validated | { error: string } {
  const title = input.title?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  if (title.length < 3 || title.length > 100) return { error: 'Title must be 3–100 characters.' }
  if (description.length < 10 || description.length > 2000) {
    return { error: 'Description must be 10–2000 characters.' }
  }
  const priceFils = aedToFils(input.priceAed)
  if (priceFils === null) return { error: 'Enter a valid price.' }
  if (!input.category_id) return { error: 'Choose a category.' }
  if (!EMIRATE_VALUES.includes(input.emirate)) return { error: 'Choose an emirate.' }
  if (!CONDITION_VALUES.includes(input.condition)) return { error: 'Choose a condition.' }
  if (!input.images?.length) {
    return { error: mode === 'create' ? 'Add at least one photo.' : 'Keep at least one photo.' }
  }
  if (input.images.length > 8) return { error: 'Up to 8 photos.' }
  return { title, description, priceFils, area: input.area?.trim() || null }
}

/** Create a listing (safety screen BEFORE any DB write; blocked → moderation log). */
export async function createListingAs(
  viewer: Viewer,
  input: ListingWriteInput,
): Promise<ListingWriteResult> {
  // Phone verification is required to publish. Checked first (shared web+mobile).
  const gate = await requirePhoneVerified(viewer)
  if (!gate.ok) return { error: gate.error, needsPhoneVerification: true }

  const v = validate(input, 'create')
  if ('error' in v) return { error: v.error }

  const safety = analyzeListingSafety(v.title, v.description)
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
    title: v.title,
    description: v.description,
    priceFils: v.priceFils,
    categoryId: input.category_id,
    condition: input.condition,
    emirate: input.emirate,
    area: v.area,
    isNegotiable: input.isNegotiable ?? true,
    images: input.images,
  })
  if (res.error) return { error: res.error }

  track('listing_created', { listingId: res.id, category_id: input.category_id })
  return { id: res.id, ok: true }
}

/** Update a listing + replace its image set (owner-only; re-screens safety). */
export async function updateListingAs(
  viewer: Viewer,
  input: ListingWriteInput & { id: string },
): Promise<ListingWriteResult> {
  const v = validate(input, 'update')
  if ('error' in v) return { error: v.error }

  // Re-screen on edit so a safe listing can't be edited into prohibited content.
  const safety = analyzeListingSafety(v.title, v.description)
  if (!safety.safe) return { blocked: true, error: PROHIBITED_MESSAGE, categories: safety.categories }

  const res = await updateListingFor(viewer, {
    id: input.id,
    title: v.title,
    description: v.description,
    priceFils: v.priceFils,
    categoryId: input.category_id,
    condition: input.condition,
    emirate: input.emirate,
    area: v.area,
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
      /* orphan cleanup is best-effort */
    }
  }

  return { ok: true, id: input.id }
}
