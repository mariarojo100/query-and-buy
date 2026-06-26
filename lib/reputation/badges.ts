export type ResponseStats = { rate: number | null; avgMinutes: number | null; sample: number }

export type ReputationStats = {
  avgRating: number | null
  reviewCount: number
  completedSales: number
  activeListings: number
  memberSince: string | null
  emailVerified: boolean
  phoneVerified: boolean
  response: ResponseStats
}

export type BadgeKey =
  | 'top_rated'
  | 'ten_sales'
  | 'trusted'
  | 'fast_responder'
  | 'verified'
  | 'ai_photos'
  | 'new_seller'

export type SellerBadge = { key: BadgeKey; label: string; tone: 'emerald' | 'gold' | 'slate' }

/**
 * Award badges automatically from live marketplace stats. Pure + deterministic,
 * so they recompute (and change) on every read as activity changes. Ordered by
 * prominence; callers can slice to limit how many show.
 */
export function computeBadges(r: ReputationStats): SellerBadge[] {
  const out: SellerBadge[] = []
  const verified = r.emailVerified || r.phoneVerified
  const ageDays = r.memberSince ? (Date.now() - new Date(r.memberSince).getTime()) / 86_400_000 : 0

  if (r.avgRating != null && r.avgRating >= 4.5 && r.reviewCount >= 3)
    out.push({ key: 'top_rated', label: 'Top Rated', tone: 'gold' })

  if (r.completedSales >= 10) out.push({ key: 'ten_sales', label: '10+ Sales', tone: 'gold' })

  if (r.completedSales >= 3 && verified && (r.avgRating == null || r.avgRating >= 4))
    out.push({ key: 'trusted', label: 'Trusted Seller', tone: 'emerald' })

  if (
    r.response.rate != null &&
    r.response.rate >= 0.7 &&
    r.response.avgMinutes != null &&
    r.response.avgMinutes <= 60 &&
    r.response.sample >= 3
  )
    out.push({ key: 'fast_responder', label: 'Fast Responder', tone: 'emerald' })

  if (verified) out.push({ key: 'verified', label: 'Verified Seller', tone: 'emerald' })

  // Every published listing passes our automated photo/safety checks at publish.
  if (r.activeListings >= 1)
    out.push({ key: 'ai_photos', label: 'AI Verified Photos', tone: 'slate' })

  if (ageDays > 0 && ageDays < 30) out.push({ key: 'new_seller', label: 'New Seller', tone: 'slate' })

  return out
}

/** Friendly "Replies in ~2h" / "Replies in ~15m" string. */
export function formatResponseTime(minutes: number | null): string | null {
  if (minutes == null) return null
  if (minutes < 60) return `~${Math.max(1, Math.round(minutes))}m`
  if (minutes < 60 * 24) return `~${Math.round(minutes / 60)}h`
  return `~${Math.round(minutes / 1440)}d`
}
