'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { submitReviewFor, reviewNotifyData } from '@/lib/db/reviews'
import { dispatch } from '@/lib/notifications/dispatch'
import { track } from '@/lib/analytics'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * Submit a review for a completed order. Eligibility (participant + completed +
 * role) is enforced in the repository; this resolves display data and notifies
 * the reviewee. One review per user/order.
 */
export async function submitReview(input: {
  orderId: string
  rating: number
  text?: string
}): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const rating = Math.round(input.rating)
  if (!(rating >= 1 && rating <= 5)) return { error: 'Pick a rating from 1 to 5 stars.' }
  const text = (input.text ?? '').trim().slice(0, 1000) || null

  const res = await submitReviewFor(viewer, { orderId: input.orderId, rating, text })
  if (!res.ok) return { error: res.error }
  track('review_submitted', { orderId: input.orderId, rating })

  const { revieweeId } = res
  const { reviewerName, revieweeUsername, listingTitle } = await reviewNotifyData(viewer.id, revieweeId, input.orderId)
  const profilePath = revieweeUsername ? `/u/${revieweeUsername}` : '/account'

  await dispatch({
    recipientId: revieweeId,
    type: 'new_review',
    title: 'New review received',
    body: `${'★'.repeat(rating)} from ${reviewerName}`,
    link: profilePath,
    email: {
      kind: 'new_review',
      data: { listingTitle, ctaUrl: `${APP_URL}${profilePath}`, rating, reviewText: text, reviewerName },
    },
  })

  revalidatePath('/account')
  revalidatePath('/u')
  return { ok: true }
}
