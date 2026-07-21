/**
 * lib/listings/write — create/update listing flows shared by the web actions
 * (app/sell/actions.ts, app/account/listings/actions.ts) AND the mobile API
 * (app/api/v1/listings/*). Because both callers funnel through here, every
 * safety rule lives in one place: verification gates, validation, the safety
 * screen, contact-info prevention, category-facet coercion, moderation
 * logging, analytics, and orphaned-image cleanup. The mobile app therefore
 * enforces exactly the same rules as the website — it cannot bypass them.
 */
import { createListingFor, updateListingFor, categorySlugChain, type ListingImageInput } from '@/lib/db/listings'
import { getStorageDriver } from '@/lib/object-storage'
import { aedToFils } from '@/lib/format'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import { detectContactInfo, CONTACT_BLOCK_MESSAGE } from '@/lib/safety/contact'
import { logModeration } from '@/lib/safety/moderation-log'
import { resolveAttributeFields, sanitizeAttributes } from '@/lib/listings/attributeSchemas'
import { emailUnverified, phoneUnverified } from '@/lib/authz/require-verified'
import { track } from '@/lib/analytics'
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
  attributes?: Record<string, string>
  images: ListingImageInput[]
}

export type ListingWriteResult = {
  id?: string
  ok?: boolean
  error?: string
  blocked?: boolean
  needVerify?: boolean
  needPhoneVerify?: boolean
  categories?: string[]
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

/** Safety + contact screens (shared by create/update). Returns a blocking result or null. */
async function screen(title: string, description: string): Promise<ListingWriteResult | null> {
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
  const contact = detectContactInfo(`${title}\n${description}`)
  if (contact.blocked) {
    await logModeration({
      source: 'listing',
      decision: 'blocked',
      confidence: 100,
      reason: `Contact info: ${contact.reasons.join(', ')}`, // categories only, never raw
    })
    return { blocked: true, error: CONTACT_BLOCK_MESSAGE }
  }
  return null
}

/** Whitelist + coerce category-specific facets against the category's schema. */
async function coerceAttributes(categoryId: string, raw: Record<string, string> | undefined) {
  const chain = await categorySlugChain(categoryId)
  return sanitizeAttributes(resolveAttributeFields(chain?.slug, chain?.parentSlug), raw)
}

/** Create a listing. Verification → validation → safety+contact screen (BEFORE any DB write). */
export async function createListingAs(
  viewer: Viewer,
  input: ListingWriteInput,
): Promise<ListingWriteResult> {
  const gate = emailUnverified(viewer)
  if (gate) return gate
  const phoneGate = await phoneUnverified(viewer)
  if (phoneGate) return phoneGate

  const v = validate(input, 'create')
  if ('error' in v) return { error: v.error }

  const blocked = await screen(v.title, v.description)
  if (blocked) return blocked

  const attributes = await coerceAttributes(input.category_id, input.attributes)

  const res = await createListingFor(viewer, {
    title: v.title,
    description: v.description,
    priceFils: v.priceFils,
    categoryId: input.category_id,
    condition: input.condition,
    emirate: input.emirate,
    area: v.area,
    isNegotiable: input.isNegotiable ?? true,
    attributes,
    images: input.images,
  })
  if (res.error) return { error: res.error }

  track('listing_created', { listingId: res.id, category_id: input.category_id })
  return { id: res.id, ok: true }
}

/** Update a listing + replace its image set (owner-only; re-screens safety + contact). */
export async function updateListingAs(
  viewer: Viewer,
  input: ListingWriteInput & { id: string },
): Promise<ListingWriteResult> {
  const gate = emailUnverified(viewer)
  if (gate) return gate

  const v = validate(input, 'update')
  if ('error' in v) return { error: v.error }

  // Re-screen on edit so a safe listing can't be edited into prohibited/contact content.
  const blocked = await screen(v.title, v.description)
  if (blocked) return blocked

  const attributes = await coerceAttributes(input.category_id, input.attributes)

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
    attributes,
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
