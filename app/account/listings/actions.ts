'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { aedToFils } from '@/lib/format'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import { LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import type { ListingImageInput } from '@/app/sell/actions'

type Result = { ok?: boolean; error?: string; blocked?: boolean; categories?: string[] }

function revalidateListing(id: string) {
  revalidatePath('/account/listings')
  revalidatePath('/')
  revalidatePath(`/listing/${id}`)
}

/** Mark an active listing as sold. Owner-only via RLS + explicit seller filter. */
export async function markSold(id: string): Promise<Result> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', id)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Listing not found.' }
  revalidateListing(id)
  return { ok: true }
}

/** Soft-delete: status='deleted' + deleted_at. Hidden from feed and dashboard. */
export async function softDeleteListing(id: string): Promise<Result> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Listing not found.' }
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const title = input.title?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  const area = input.area?.trim() || null

  if (title.length < 3 || title.length > 100) return { error: 'Title must be 3–100 characters.' }
  if (description.length < 10 || description.length > 2000)
    return { error: 'Description must be 10–2000 characters.' }
  const price_fils = aedToFils(input.priceAed)
  if (price_fils === null) return { error: 'Enter a valid price.' }
  if (!EMIRATE_VALUES.includes(input.emirate)) return { error: 'Choose an emirate.' }
  if (!CONDITION_VALUES.includes(input.condition)) return { error: 'Choose a condition.' }
  if (!input.images?.length) return { error: 'Keep at least one photo.' }
  if (input.images.length > 8) return { error: 'Up to 8 photos.' }

  // Re-screen on edit so a safe listing can't be edited into prohibited content.
  // Block BEFORE writing — nothing is updated if it fails.
  const safety = analyzeListingSafety(title, description)
  if (!safety.safe) {
    return { blocked: true, error: PROHIBITED_MESSAGE, categories: safety.categories }
  }

  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('id', input.category_id)
    .eq('is_active', true)
    .maybeSingle()
  if (!cat) return { error: 'That category is unavailable.' }

  // Update fields — RLS + seller filter enforce ownership.
  const { data: updated, error: updErr } = await supabase
    .from('listings')
    .update({
      title_en: title,
      description,
      price_fils,
      category_id: input.category_id,
      condition: input.condition,
      emirate: input.emirate,
      area,
      is_negotiable: input.isNegotiable ?? true,
    })
    .eq('id', input.id)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle()

  if (updErr) {
    console.error('updateListing update failed:', updErr)
    return { error: 'Could not save your changes. Please try again.' }
  }
  if (!updated) return { error: 'Listing not found.' }

  // Replace image rows: remove all, reinsert the final ordered set.
  const { data: existing } = await supabase
    .from('listing_images')
    .select('storage_key')
    .eq('listing_id', input.id)
  const existingKeys = ((existing ?? []) as { storage_key: string }[]).map((r) => r.storage_key)
  const finalKeys = new Set(input.images.map((i) => i.storage_key))
  const removed = existingKeys.filter((k) => !finalKeys.has(k))

  const { error: delErr } = await supabase
    .from('listing_images')
    .delete()
    .eq('listing_id', input.id)
  if (delErr) {
    console.error('updateListing image delete failed:', delErr)
    return { error: 'Could not save your changes. Please try again.' }
  }

  const rows = input.images.map((im) => ({
    listing_id: input.id,
    storage_key: im.storage_key,
    position: im.position,
    width: im.width ?? null,
    height: im.height ?? null,
  }))
  const { error: insErr } = await supabase.from('listing_images').insert(rows)
  if (insErr) {
    console.error('updateListing image insert failed:', insErr)
    return { error: 'Could not save your photos. Please try again.' }
  }

  // Best-effort: delete orphaned storage objects for removed images.
  if (removed.length > 0) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(removed)
  }

  revalidateListing(input.id)
  return { ok: true }
}
