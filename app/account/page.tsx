import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { getSellerReputation } from '@/lib/reputation/queries'
import { getProfileReviews } from '@/lib/reviews/queries'
import { getActivity } from '@/lib/account/activity'
import { computeTrust } from '@/lib/trust/score'
import { ReputationCard } from '@/components/account/ReputationCard'
import { ActivityTimeline } from '@/components/account/ActivityTimeline'
import { ProfileCompletion } from '@/components/profile/ProfileCompletion'
import type { Profile } from '@/lib/profile/completion'

export const metadata = { title: 'My profile · Query & Buy' }

type TrustProfile = Profile & {
  email_verified: boolean
  phone_verified: boolean
  reports_count: number
}

export default async function AccountOverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, bio, emirate, badge_level, listings_count, member_since, email_verified, phone_verified, reports_count',
    )
    .eq('id', user.id)
    .maybeSingle()
  const profile = data as TrustProfile | null
  if (!profile) return null

  const [rep, recentReviews, activity] = await Promise.all([
    getSellerReputation(profile.id, { withResponse: true }),
    getProfileReviews(profile.id, 4),
    getActivity(profile.id, profile.member_since, 12),
  ])

  let repeatBuyers = 0
  try {
    const admin = createServiceClient()
    const { data: rows } = await admin
      .from('orders')
      .select('buyer_id')
      .eq('seller_id', profile.id)
      .eq('status', 'completed')
    const counts = new Map<string, number>()
    for (const r of (rows ?? []) as { buyer_id: string }[])
      counts.set(r.buyer_id, (counts.get(r.buyer_id) ?? 0) + 1)
    repeatBuyers = [...counts.values()].filter((n) => n >= 2).length
  } catch {
    /* no service role → 0 */
  }

  const trust = computeTrust({
    display_name: profile.display_name,
    username: profile.username,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    emirate: profile.emirate,
    email_verified: profile.email_verified,
    phone_verified: profile.phone_verified,
    member_since: profile.member_since,
    listings_count: profile.listings_count,
    reports_count: profile.reports_count,
  })

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <ReputationCard
          rep={rep}
          trustScore={trust.score}
          repeatBuyers={repeatBuyers}
          recentReviews={recentReviews}
        />
        <ProfileCompletion profile={profile} />
      </div>
      <div className="lg:col-span-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
          <h2 className="font-display mb-5 text-xl tracking-tight">Activity</h2>
          <ActivityTimeline events={activity} />
        </div>
      </div>
    </div>
  )
}
