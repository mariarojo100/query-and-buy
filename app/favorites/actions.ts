'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

/** Toggle a favorite for the current user. RLS (fav_owner_all) scopes to owner. */
export async function toggleFavorite(
  listingId: string,
): Promise<{ favorited?: boolean; needAuth?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needAuth: true }

  const { data: existing } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    if (error) return { error: error.message }
    revalidatePath('/favorites')
    return { favorited: false }
  }

  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, listing_id: listingId })
  if (error) return { error: error.message }
  revalidatePath('/favorites')
  return { favorited: true }
}
