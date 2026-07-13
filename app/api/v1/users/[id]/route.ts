/**
 * GET /api/v1/users/:username — public seller profile: profile card, active
 * listings, review stats + recent reviews (read-only in mobile v1).
 */
import { profileByUsername } from '@/lib/db/profiles'
import { sellerListings } from '@/lib/db/listings'
import { reviewStatsFor, profileReviewsFor } from '@/lib/db/reviews'
import { ok, notFound, handle } from '@/lib/api/respond'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ username: string }> },
): Promise<Response> {
  return handle(async () => {
    const { username } = await ctx.params
    const profile = await profileByUsername(username.toLowerCase())
    if (!profile) return notFound('Profile')

    const [listings, reviewStats, reviews] = await Promise.all([
      sellerListings(profile.id, { limit: 24 }),
      reviewStatsFor(profile.id),
      profileReviewsFor(profile.id, 6),
    ])

    return ok({ profile, listings, reviewStats, reviews })
  })
}
