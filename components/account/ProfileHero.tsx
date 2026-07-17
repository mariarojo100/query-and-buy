import Link from 'next/link'
import {
  ActivityIcon,
  BadgeCheckIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ShoppingBagIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileBanner } from '@/components/profile/ProfileBanner'
import { VerifiedAvatarBadge } from '@/components/profile/VerifiedAvatarBadge'
import { SellerBadges } from '@/components/trust/SellerBadges'
import { ShareProfileButton } from '@/components/account/ShareProfileButton'
import { emirateLabel } from '@/lib/profile/emirates'
import { formatResponseTime } from '@/lib/reputation/badges'
import type { Profile } from '@/lib/profile/completion'
import type { SellerReputation } from '@/lib/reputation/queries'

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

type HeroStat = { icon: LucideIcon; value: React.ReactNode; label: string }

function Stat({ icon: Icon, value, label }: HeroStat) {
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3.5 sm:px-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-gold">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg leading-none tracking-tight tnum">{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function ProfileHero({
  profile,
  rep,
  avatarSlot,
  verified = false,
  repeatBuyers = 0,
}: {
  profile: Profile
  rep: SellerReputation
  avatarSlot: React.ReactNode
  /** Fully verified = email AND phone confirmed. Drives the avatar + name badge. */
  verified?: boolean
  repeatBuyers?: number
}) {
  const stats: HeroStat[] = [
    {
      icon: StarIcon,
      value: rep.avgRating != null ? rep.avgRating.toFixed(1) : '—',
      label: rep.reviewCount > 0 ? `${rep.reviewCount} reviews` : 'No reviews yet',
    },
    { icon: ShoppingBagIcon, value: rep.completedSales, label: 'Completed sales' },
    { icon: UsersIcon, value: repeatBuyers, label: 'Repeat buyers' },
    {
      icon: ActivityIcon,
      value: rep.response.rate != null ? `${Math.round(rep.response.rate * 100)}%` : '—',
      label: 'Reply rate',
    },
    { icon: ClockIcon, value: formatResponseTime(rep.response.avgMinutes) ?? '—', label: 'Avg reply time' },
    { icon: UserIcon, value: 0, label: 'Followers' },
  ]

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      {/* Identity block sits on the dark ink banner in cream text. */}
      <div className="relative text-primary-foreground">
        <ProfileBanner />
        <div className="relative px-5 pb-16 pt-6 sm:px-8 sm:pb-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className="relative shrink-0">
                {avatarSlot}
                <VerifiedAvatarBadge verified={verified} size="lg" className="bottom-1 right-1" />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
                    {profile.display_name}
                  </h1>
                  {verified && (
                    <BadgeCheckIcon
                      className="size-6 shrink-0 fill-gold text-primary"
                      aria-label="Verified account"
                    />
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-foreground/70">
                  {profile.username && <span>@{profile.username}</span>}
                  {profile.emirate && (
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-3.5" />
                      {emirateLabel(profile.emirate)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDaysIcon className="size-3.5" />
                    Member since {memberSince(profile.member_since)}
                  </span>
                </div>
                <SellerBadges badges={rep.badges} limit={4} onDark className="mt-3" />
                {profile.bio && (
                  <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-primary-foreground/85">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                asChild
                size="sm"
                className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href="/account/settings">
                  <PencilIcon className="size-4" /> Edit profile
                </Link>
              </Button>
              <ShareProfileButton username={profile.username} onDark />
              <Button
                asChild
                variant="outline"
                size="icon"
                className="size-9 rounded-full border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                aria-label="More options"
              >
                <Link href="/account/settings">
                  <MoreHorizontalIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat strip — overlaps up into the banner. */}
      <div className="relative z-10 -mt-8 px-5 pb-6 sm:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-float sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}
