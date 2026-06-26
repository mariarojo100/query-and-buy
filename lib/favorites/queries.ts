import { createClient } from '@/utils/supabase/server'
import type { FeedListing, SellerMini } from '@/lib/listings/queries'

type RawImage = { storage_key: string; position: number }

function coverKey(images: RawImage[] | null | undefined): string | null {
  if (!images?.length) return null
  return [...images].sort((a, b) => a.position - b.position)[0].storage_key
}

/** Which of the given listing ids the current user has favorited (empty if logged out). */
export async function getFavoritedIds(listingIds: string[]): Promise<Set<string>> {
  const set = new Set<string>()
  if (listingIds.length === 0) return set
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return set

  const { data } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', user.id)
    .in('listing_id', listingIds)
  for (const row of (data ?? []) as { listing_id: string }[]) set.add(row.listing_id)
  return set
}

/** The current user's favorited listings that are still active, newest-saved first. */
export async function getUserFavorites(): Promise<FeedListing[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('favorites')
    .select(
      'created_at, listing:listings(id, title_en, price_fils, currency, emirate, area, condition, status, deleted_at, seller_id, published_at, is_featured, view_count, images:listing_images(storage_key, position))',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  type Row = {
    listing: {
      id: string
      title_en: string
      price_fils: number
      currency: string
      emirate: string | null
      area: string | null
      condition: string
      status: string
      deleted_at: string | null
      seller_id: string
      published_at: string | null
      is_featured: boolean
      view_count: number
      images: RawImage[] | null
    } | null
  }
  const rows = (data ?? []) as unknown as Row[]

  // Keep only listings still visible + active (RLS may also null out sold/deleted ones).
  const listings = rows
    .map((r) => r.listing)
    .filter((l): l is NonNullable<Row['listing']> => !!l && l.status === 'active' && !l.deleted_at)

  // Seller mini-profiles (profiles is public-read).
  const sellerIds = [...new Set(listings.map((l) => l.seller_id))]
  const sellers = new Map<string, SellerMini>()
  if (sellerIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, badge_level, email_verified')
      .in('id', sellerIds)
    for (const p of (profs ?? []) as SellerMini[]) sellers.set(p.id, p)
  }

  return listings.map((l) => ({
    id: l.id,
    title_en: l.title_en,
    price_fils: l.price_fils,
    currency: l.currency,
    emirate: l.emirate,
    area: l.area,
    condition: l.condition,
    cover_key: coverKey(l.images),
    published_at: l.published_at,
    is_featured: l.is_featured,
    view_count: l.view_count ?? 0,
    seller: sellers.get(l.seller_id) ?? null,
  }))
}
