import { getViewer } from '@/lib/auth/session'
import { profileById, repeatBuyersFor } from '@/lib/db/profiles'
import { getSellerReputation } from '@/lib/reputation/queries'
import { getProfileReviews } from '@/lib/reviews/queries'
import { getActivity } from '@/lib/account/activity'
import { computeTrust } from '@/lib/trust/score'
import { ReputationCard } from '@/components/account/ReputationCard'
import { ActivityTimeline } from '@/components/account/ActivityTimeline'
import { ProfileCompletion } from '@/components/profile/ProfileCompletion'
import { VerifyEmailBanner } from '@/components/account/VerifyEmailBanner'
import type { Profile } from '@/lib/profile/completion'

export const metadata = { title: 'My profile · Query & Buy' }

type TrustProfile = Profile & {
  email_verified: boolean
  phone_verified: boolean
  reports_count: number
}

export default async function AccountOverviewPage() {
  const user = await getViewer()
  if (!user) return null

  const profile = (await profileById(user.id)) as TrustProfile | null
  if (!profile) return null

  const [rep, recentReviews, activity] = await Promise.all([
    getSellerReputation(profile.id, { withResponse: true }),
    getProfileReviews(profile.id, 4),
    getActivity(profile.id, profile.member_since, 12),
  ])

  const repeatBuyers = await repeatBuyersFor(profile.id)

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
    <div className="space-y-6">
      {!profile.email_verified && <VerifyEmailBanner email={user.email} />}
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
    </div>
  )
}
