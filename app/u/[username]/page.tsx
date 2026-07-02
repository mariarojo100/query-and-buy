import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDaysIcon, MapPinIcon, MessagesSquareIcon, PackageIcon, PencilIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { MessageSellerButton } from '@/components/profile/MessageSellerButton'
import { ReportButton } from '@/components/report/ReportButton'
import { TrustScore } from '@/components/trust/TrustScore'
import { TrustSignals } from '@/components/trust/TrustSignals'
import { ListingCard } from '@/components/listing/ListingCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Stars } from '@/components/reviews/Stars'
import { ReviewList } from '@/components/reviews/ReviewList'
import { computeTrust } from '@/lib/trust/score'
import { emirateLabel } from '@/lib/profile/emirates'
import { sellerName, publicHandle } from '@/lib/profile/display'
import { getSellerListings } from '@/lib/listings/queries'
import { getFavoritedIds } from '@/lib/favorites/queries'
import { getReviewStats, getReputation, getProfileReviews } from '@/lib/reviews/queries'
import { absoluteUrl } from '@/lib/site'
import { track } from '@/lib/analytics'
import { getSellerReputation } from '@/lib/reputation/queries'
import { formatResponseTime } from '@/lib/reputation/badges'
import { SellerBadges } from '@/components/trust/SellerBadges'
import type { Profile } from '@/lib/profile/completion'

/**
 * Public seller profile.
 *
 * Deferred / future work (intentionally NOT built yet):
 * - Phone verification: `phone_verified` is currently a placeholder in the trust
 *   model. Wire it to a real OTP provider (e.g. Twilio Verify / Firebase) and
 *   only surface a "Phone Verified" badge once the flow actually sets the flag.
 * - Cover image: the hero uses a brand gradient. A `cover_image_url` column can
 *   be added later so sellers personalise the hero (fall back to the gradient).
 * - Pagination: reviews (6) and listings (12) are capped fetches. Add a
 *   "See all" / cursor pagination when per-seller volume grows.
 * - User-to-user messaging: conversations are listing-bound today, so the
 *   "Message seller" CTA anchors to the seller's newest listing. See
 *   components/profile/MessageSellerButton for the listing-less migration path.
 */
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
  const name = sellerName(profile.display_name)
  const handle = publicHandle(profile.username)
  const description = profile.bio ?? `${name} on Query & Buy — buy & sell across the UAE.`
  return {
    title: `${name}${handle ? ` (${handle})` : ''} · Query & Buy`,
    description,
    alternates: { canonical: `/u/${username}` },
    openGraph: {
      type: 'profile',
      title: `${name}${handle ? ` (${handle})` : ''}`,
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

  const name = sellerName(profile.display_name)
  const handle = publicHandle(profile.username)
  const location = emirateLabel(profile.emirate)
  const memberSince = new Date(profile.member_since).getFullYear()
  const replyTime = formatResponseTime(rep.response.avgMinutes)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8">
        {/* Cover — soft brand gradient with a whisper of gold, not a flat block */}
        <div className="relative mt-2 h-40 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-success shadow-soft sm:h-56">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.9) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
            aria-hidden
          />
          <div className="absolute -right-16 -top-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-28 left-8 size-80 rounded-full bg-gold/25 blur-2xl" aria-hidden />
          <div
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent"
            aria-hidden
          />
        </div>

        {/* Identity */}
        <div className="-mt-14 px-1 sm:-mt-16 sm:flex sm:items-end sm:gap-6">
          <Avatar className="size-28 shrink-0 shadow-float ring-4 ring-background sm:size-32">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={`${name}'s profile photo`} />
            <AvatarFallback className="bg-accent text-2xl text-accent-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-4 min-w-0 flex-1 sm:mb-1.5 sm:mt-0">
            <h1 className="font-display text-3xl leading-tight tracking-tight break-words sm:text-4xl">
              {name}
            </h1>
            {handle && <p className="mt-1 truncate text-sm text-muted-foreground">{handle}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-4 shrink-0" aria-hidden />
                  {location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDaysIcon className="size-4 shrink-0" aria-hidden />
                Member since {memberSince}
              </span>
            </div>
            <SellerBadges badges={rep.badges} className="mt-3" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mb-1.5 sm:mt-0 sm:justify-end">
            {isSelf ? (
              <Button variant="outline" asChild>
                <Link href="/account/settings">
                  <PencilIcon className="size-4" aria-hidden />
                  Edit profile
                </Link>
              </Button>
            ) : (
              <>
                {listings.length > 0 && (
                  <MessageSellerButton
                    listingId={listings[0].id}
                    username={username}
                    authed={!!user}
                  />
                )}
                <ReportButton target="user" reportedUserId={profile.id} authed={!!user} />
              </>
            )}
          </div>
        </div>

        {/* Reputation stat band */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label={stats.average != null ? 'Rating' : 'No ratings yet'}>
            {stats.average != null ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl leading-none tracking-tight tnum">
                  {stats.average.toFixed(1)}
                </span>
                <Stars value={stats.average} size="size-3.5" />
              </div>
            ) : (
              <span className="font-display text-2xl leading-none text-muted-foreground">—</span>
            )}
          </StatCard>
          <StatCard label="Reviews">
            <StatValue value={stats.count} />
          </StatCard>
          <StatCard label="Completed sales">
            <StatValue value={reputation.completedSales} />
          </StatCard>
          <StatCard label="Completed purchases">
            <StatValue value={reputation.completedPurchases} />
          </StatCard>
          <StatCard label="Active listings">
            <StatValue value={profile.listings_count} />
          </StatCard>
        </div>

        {/* Trust + about */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section
            aria-labelledby="trust-heading"
            className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-1"
          >
            <h2 id="trust-heading" className="eyebrow mb-4">
              Trust
            </h2>
            <TrustScore trust={trust} />
            <p className="eyebrow mb-3 mt-6">What builds this score</p>
            <TrustSignals
              emailVerified={profile.email_verified}
              phoneVerified={profile.phone_verified}
              reviewCount={stats.count}
              completedSales={reputation.completedSales}
              responseRate={rep.response.rate}
              memberSince={profile.member_since}
            />
            {replyTime && (
              <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                Typically replies in {replyTime}
              </p>
            )}
          </section>

          <section
            aria-labelledby="about-heading"
            className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2"
          >
            <h2 id="about-heading" className="eyebrow mb-3">
              About
            </h2>
            {profile.bio ? (
              <p className="whitespace-pre-line text-[15px] leading-[1.75] text-foreground/90">
                {profile.bio}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[15px] leading-relaxed text-foreground/90">
                  This seller hasn’t added a bio yet.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Check their listings, reviews, and verification badges before making a deal.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Reviews */}
        <section aria-labelledby="reviews-heading" className="mt-12">
          <div className="mb-5 flex items-end gap-3">
            <h2 id="reviews-heading" className="eyebrow">
              Reviews
            </h2>
            {stats.count > 0 && (
              <span className="text-sm text-muted-foreground">{stats.count}</span>
            )}
          </div>
          {reviews.length === 0 ? (
            <EmptyState
              icon={MessagesSquareIcon}
              title="No reviews yet"
              description="Reviews will appear here after completed transactions with this seller."
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <ReviewList reviews={reviews} />
            </div>
          )}
        </section>

        {/* Listings */}
        <section aria-labelledby="listings-heading" className="mt-12">
          <div className="mb-6 flex items-end gap-3">
            <h2 id="listings-heading" className="eyebrow">
              Listings by this seller
            </h2>
            {listings.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {profile.listings_count} active
              </span>
            )}
          </div>
          {listings.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="No active listings right now"
              description={`${name} doesn’t have anything for sale at the moment. Check back soon.`}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  favorited={favoritedIds.has(l.id)}
                  authed={!!user}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

/** Uniform stat tile — equal height, value on top, label beneath. */
function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[92px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="min-h-8">{children}</div>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  )
}

function StatValue({ value }: { value: number }) {
  return (
    <span className="font-display text-2xl leading-none tracking-tight tnum">
      {value.toLocaleString('en-AE')}
    </span>
  )
}
