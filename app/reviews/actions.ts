'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { dispatch } from '@/lib/notifications/dispatch'
import { track } from '@/lib/analytics'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/** Submit a review for a completed order. RLS enforces eligibility; this also
 *  resolves role/reviewee and notifies the reviewee. One review per user/order. */
export async function submitReview(input: {
  orderId: string
  rating: number
  text?: string
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const rating = Math.round(input.rating)
  if (!(rating >= 1 && rating <= 5)) return { error: 'Pick a rating from 1 to 5 stars.' }
  const text = (input.text ?? '').trim().slice(0, 1000) || null

  const { data: orderRow } = await supabase
    .from('orders')
    .select('id, listing_id, buyer_id, seller_id, status')
    .eq('id', input.orderId)
    .maybeSingle()
  const order = orderRow as
    | { id: string; listing_id: string; buyer_id: string; seller_id: string; status: string }
    | null
  if (!order) return { error: 'Order not found.' }
  if (order.status !== 'completed')
    return { error: 'You can review once the transaction is completed.' }

  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === order.seller_id
  if (!isBuyer && !isSeller) return { error: 'Not allowed.' }
  const reviewerRole = isBuyer ? 'buyer' : 'seller'
  const revieweeId = isBuyer ? order.seller_id : order.buyer_id

  const { error } = await supabase.from('reviews').insert({
    order_id: order.id,
    listing_id: order.listing_id,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    reviewer_role: reviewerRole,
    rating,
    review_text: text,
  })
  if (error) {
    if (error.code === '23505') return { error: 'You already reviewed this transaction.' }
    return { error: error.message }
  }
  track('review_submitted', { orderId: order.id, rating })

  const [{ data: reviewerProf }, { data: revieweeProf }, { data: listing }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    supabase.from('profiles').select('username').eq('id', revieweeId).maybeSingle(),
    supabase.from('listings').select('title_en').eq('id', order.listing_id).maybeSingle(),
  ])
  const reviewerName = (reviewerProf as { display_name?: string } | null)?.display_name ?? 'A user'
  const username = (revieweeProf as { username?: string } | null)?.username ?? null
  const profilePath = username ? `/u/${username}` : '/account'
  const listingTitle = (listing as { title_en?: string } | null)?.title_en ?? 'a recent transaction'

  await dispatch({
    recipientId: revieweeId,
    type: 'new_review',
    title: 'New review received',
    body: `${'★'.repeat(rating)} from ${reviewerName}`,
    link: profilePath,
    email: {
      kind: 'new_review',
      data: {
        listingTitle,
        ctaUrl: `${APP_URL}${profilePath}`,
        rating,
        reviewText: text,
        reviewerName,
      },
    },
  })

  revalidatePath('/account')
  revalidatePath('/u')
  return { ok: true }
}
