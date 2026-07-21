import { getViewer } from '@/lib/auth/session'
import { profileById, repeatBuyersFor } from '@/lib/db/profiles'
import { getSellerReputation } from '@/lib/reputation/queries'
import { getActivity } from '@/lib/account/activity'
import { getSellerListings } from '@/lib/listings/queries'
import { computeTrust } from '@/lib/trust/score'
import { ReputationCard } from '@/components/account/ReputationCard'
import { AboutCard } from '@/components/account/AboutCard'
import { ListingsPreviewCard } from '@/components/account/ListingsPreviewCard'
import { ActivityTimeline } from '@/components/account/ActivityTimeline'
import { CardHeading } from '@/components/account/CardHeading'
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

  const [rep, activity, listings, repeatBuyers] = await Promise.all([
    getSellerReputation(profile.id, { withResponse: true }),
    getActivity(profile.id, profile.member_since, 6),
    getSellerListings(profile.id, { limit: 3 }),
    repeatBuyersFor(profile.id),
  ])

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

      {/* Overview: About · Reputation · Recent activity · Listings */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <AboutCard profile={profile} avgReplyMinutes={rep.response.avgMinutes} />
        </div>
        <div className="lg:col-span-4">
          <ReputationCard rep={rep} trustScore={trust.score} repeatBuyers={repeatBuyers} />
        </div>
        <div className="lg:col-span-3">
          <div className="h-full rounded-3xl border border-border bg-card p-5 shadow-soft">
            <CardHeading>Recent activity</CardHeading>
            <div className="mt-4">
              <ActivityTimeline events={activity} />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <ListingsPreviewCard listings={listings} activeCount={profile.listings_count} />
        </div>
      </div>

      <ProfileCompletion profile={profile} />
    </div>
  )
}
