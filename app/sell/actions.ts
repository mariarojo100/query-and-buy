'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { aedToFils } from '@/lib/format'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { CONDITION_VALUES } from '@/lib/listings/conditions'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import { logModeration } from '@/lib/safety/moderation-log'
import { track } from '@/lib/analytics'
import { logger } from '@/lib/logger'

export type ListingImageInput = {
  storage_key: string
  position: number
  width?: number | null
  height?: number | null
}

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
): Promise<{ id?: string; error?: string; blocked?: boolean; categories?: string[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to sell.' }

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

  // category must exist and be active
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('id', input.category_id)
    .eq('is_active', true)
    .maybeSingle()
  if (!cat) return { error: 'That category is unavailable.' }

  const now = new Date()
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      category_id: input.category_id,
      title_en: title,
      description,
      price_fils,
      condition: input.condition,
      emirate: input.emirate,
      area,
      is_negotiable: input.isNegotiable ?? true,
      status: 'active',
      published_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select('id')
    .single()

  if (error || !listing) {
    logger.error('sell.createListing', 'listing insert failed', { code: error?.code })
    return { error: 'Could not create your listing. Please try again.' }
  }

  const rows = input.images.map((im) => ({
    listing_id: listing.id as string,
    storage_key: im.storage_key,
    position: im.position,
    width: im.width ?? null,
    height: im.height ?? null,
  }))
  const { error: imgErr } = await supabase.from('listing_images').insert(rows)
  if (imgErr) {
    logger.error('sell.createListing', 'image insert failed', { code: imgErr.code })
    return { error: 'Could not save your photos. Please try again.' }
  }

  track('listing_created', { listingId: listing.id, category_id: input.category_id })
  revalidatePath('/')
  return { id: listing.id as string }
}
