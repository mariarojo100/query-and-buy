import { profileCompletion, type Profile } from '@/lib/profile/completion'

/** Public, world-readable inputs (all live on the profiles row) → RLS-safe. */
export type TrustInputs = {
  display_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  emirate: string | null
  email_verified: boolean
  phone_verified: boolean
  member_since: string
  listings_count: number
  reports_count: number
}

export type TrustTier = 'new' | 'rising' | 'trusted'

export type TrustResult = {
  score: number // 0–100
  tier: TrustTier
  tierLabel: string
  emailVerified: boolean
  phoneVerified: boolean
  trustedSeller: boolean
  breakdown: { label: string; points: number }[]
}

const TIER_LABELS: Record<TrustTier, string> = {
  new: 'New seller',
  rising: 'Rising seller',
  trusted: 'Trusted seller',
}

function monthsSince(iso: string): number {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 0
  const days = (Date.now() - then) / 86_400_000
  return Math.max(0, days / 30.4)
}

/**
 * Compute a 0–100 trust score from public profile signals:
 * profile completion, email + phone verification, account age, listing count,
 * and reports (penalty). Deterministic and pure.
 */
export function computeTrust(p: TrustInputs): TrustResult {
  const completion = profileCompletion({
    id: '',
    badge_level: '',
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: p.bio,
    emirate: p.emirate,
    listings_count: p.listings_count,
    member_since: p.member_since,
  } as Profile).percent

  const ageMonths = monthsSince(p.member_since)

  const breakdown = [
    { label: 'Profile completion', points: Math.round((completion / 100) * 25) }, // max 25
    { label: 'Email verified', points: p.email_verified ? 20 : 0 }, // 20
    { label: 'Phone verified', points: p.phone_verified ? 15 : 0 }, // 15 (placeholder)
    { label: 'Account age', points: Math.round((Math.min(ageMonths, 12) / 12) * 20) }, // max 20
    { label: 'Listings', points: Math.round((Math.min(p.listings_count, 10) / 10) * 10) }, // max 10
    { label: 'Reports', points: -Math.min(p.reports_count * 10, 30) }, // penalty up to -30
  ]

  const raw = breakdown.reduce((sum, b) => sum + b.points, 0)
  const score = Math.max(0, Math.min(100, raw))

  const tier: TrustTier = score >= 70 ? 'trusted' : score >= 40 ? 'rising' : 'new'

  return {
    score,
    tier,
    tierLabel: TIER_LABELS[tier],
    emailVerified: p.email_verified,
    phoneVerified: p.phone_verified,
    trustedSeller: tier === 'trusted',
    breakdown,
  }
}
