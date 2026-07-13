import { getViewer } from '@/lib/auth/session'
import { reviewStatsFor, profileReviewsFor, reputationCountsFor, myReviewFor } from '@/lib/db/reviews'

export type { Review, ReviewStats, Reputation } from '@/lib/db/reviews'

/** Average rating + review count for a user (public). */
export function getReviewStats(userId: string) {
  return reviewStatsFor(userId)
}

/** Most recent reviews received by a user, with reviewer profile (public). */
export function getProfileReviews(userId: string, limit = 6) {
  return profileReviewsFor(userId, limit)
}

/** Completed-sale / completed-purchase counts for any user (public aggregate). */
export function getReputation(userId: string) {
  return reputationCountsFor(userId)
}

/** The current user's review for an order, if they've left one (owner-scoped). */
export async function getMyReview(orderId: string): Promise<{ rating: number; review_text: string | null } | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  return myReviewFor(viewer, orderId)
}
