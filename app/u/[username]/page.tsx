import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarDaysIcon, MapPinIcon, PackageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { ReportButton } from '@/components/report/ReportButton'
import { TrustScore } from '@/components/trust/TrustScore'
import { VerificationBadges } from '@/components/trust/VerificationBadges'
import { ListingResults } from '@/components/listing/ListingResults'
import { EmptyState } from '@/components/common/EmptyState'
import { Stars } from '@/components/reviews/Stars'
import { ReviewList } from '@/components/reviews/ReviewList'
import { computeTrust } from '@/lib/trust/score'
import { emirateLabel } from '@/lib/profile/emirates'
import { getSellerListings } from '@/lib/listings/queries'
import { getFavoritedIds } from '@/lib/favorites/queries'
import { getReviewStats, getReputation, getProfileReviews } from '@/lib/reviews/queries'
import { absoluteUrl } from '@/lib/site'
import { track } from '@/lib/analytics'
import { getSellerReputation } from '@/lib/reputation/queries'
import { formatResponseTime } from '@/lib/reputation/badges'
import { SellerBadges } from '@/components/trust/SellerBadges'
import type { Profile } from '@/lib/profile/completion'

type ProfileWithTrust = Profile & {
  email_verified: boolean
  phone_verified: boolean
  reports_count: number
}

const PROFILE_COLUMNS =
  'id, username, display_name, avatar_url, bio, emirate, badge_level, listings_count, member_since, email_verified, phone_verified, reports_count'

async function getProfile(username: string): Promise<ProfileWithTrust | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', username)
    .maybeSingle()
  return data as ProfileWithTrust | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) return { title: 'Profile not found · Query & Buy' }
  const description = profile.bio ?? `${profile.display_name} on Query & Buy — buy & sell across the UAE.`
  return {
    title: `${profile.display_name} (@${profile.username}) · Query & Buy`,
    description,
    alternates: { canonical: `/u/${username}` },
    openGraph: {
      type: 'profile',
      title: `${profile.display_name} (@${profile.username})`,
      description,
      url: absoluteUrl(`/u/${username}`),
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) notFound()
  track('profile_viewed', { username })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isSelf = user?.id === profile.id

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

  const [listings, stats, reputation, reviews, rep] = await Promise.all([
    getSellerListings(profile.id, { limit: 12 }),
    getReviewStats(profile.id),
    getReputation(profile.id),
    getProfileReviews(profile.id, 6),
    getSellerReputation(profile.id, { withResponse: true }),
  ])
  const favoritedIds = await getFavoritedIds(listings.map((l) => l.id))
  const memberSince = new Date(profile.member_since).getFullYear()

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 pb-12 sm:px-8">
        {/* Cover */}
        <div className="relative mt-2 h-36 overflow-hidden rounded-3xl bg-primary shadow-soft sm:h-52">
          <div className="absolute -right-10 -top-16 size-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 left-10 size-72 rounded-full bg-gold/15" />
        </div>

        {/* Identity */}
        <div className="-mt-12 px-1 sm:-mt-14 sm:flex sm:items-end sm:gap-6">
          <Avatar className="size-24 ring-4 ring-background sm:size-28">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
            <AvatarFallback className="text-2xl">{initials(profile.display_name)}</AvatarFallback>
          </Avatar>

          <div className="mt-4 flex-1 sm:mb-2 sm:mt-0">
            <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              {profile.display_name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profile.username && <span>@{profile.username}</span>}
              {profile.emirate && (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-3.5" />
                  {emirateLabel(profile.emirate)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDaysIcon className="size-3.5" />
                Member since {memberSince}
              </span>
            </div>
            <SellerBadges badges={rep.badges} className="mt-3" />
          </div>

          {!isSelf && (
            <div className="mt-4 sm:mb-2 sm:mt-0">
              <ReportButton target="user" reportedUserId={profile.id} authed={!!user} />
            </div>
          )}
        </div>

        {/* Reputation stat band */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="eyebrow">Rating</p>
            {stats.average != null ? (
              <div className="mt-1.5">
                <p className="font-display text-2xl tracking-tight tnum">{stats.average.toFixed(1)}</p>
                <Stars value={stats.average} size="size-3.5" className="mt-1" />
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">No ratings yet</p>
            )}
          </div>
          <Stat label="Reviews" value={stats.count} />
          <Stat label="Completed sales" value={reputation.completedSales} />
          <Stat label="Completed purchases" value={reputation.completedPurchases} />
        </div>

        {/* Trust + about */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-1">
            <p className="eyebrow mb-4">Trust</p>
            <TrustScore trust={trust} />
            <VerificationBadges trust={trust} className="mt-4" />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <p className="eyebrow">Response rate</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rep.response.rate != null
                    ? `${Math.round(rep.response.rate * 100)}%`
                    : 'Not enough data'}
                </p>
              </div>
              <div>
                <p className="eyebrow">Response time</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatResponseTime(rep.response.avgMinutes) ?? 'Not enough data'}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
            <p className="eyebrow mb-3">About</p>
            <p className="whitespace-pre-line text-[15px] leading-[1.75] text-foreground/90">
              {profile.bio || `${profile.display_name} hasn’t added a bio yet.`}
            </p>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-12">
          <div className="mb-5 flex items-end gap-3">
            <p className="eyebrow">Reviews</p>
            <span className="text-sm text-muted-foreground">{stats.count}</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <ReviewList reviews={reviews} />
          </div>
        </section>

        {/* Listings */}
        <section className="mt-12">
          <div className="mb-6 flex items-end gap-3">
            <p className="eyebrow">Listings</p>
            <span className="text-sm text-muted-foreground">
              {profile.listings_count} active
            </span>
          </div>
          {listings.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="No active listings"
              description={`${profile.display_name} doesn’t have anything for sale right now.`}
            />
          ) : (
            <ListingResults
              listings={listings}
              count={listings.length}
              favoritedIds={favoritedIds}
              authed={!!user}
            />
          )}
        </section>
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="font-display text-2xl tracking-tight tnum">{value.toLocaleString('en-AE')}</p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  )
}
