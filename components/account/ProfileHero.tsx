import Link from 'next/link'
import {
  CalendarDaysIcon,
  MapPinIcon,
  PencilIcon,
  SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import { SellerBadges } from '@/components/trust/SellerBadges'
import { ShareProfileButton } from '@/components/account/ShareProfileButton'
import { Stars } from '@/components/reviews/Stars'
import { emirateLabel } from '@/lib/profile/emirates'
import { formatResponseTime } from '@/lib/reputation/badges'
import type { Profile } from '@/lib/profile/completion'
import type { SellerReputation } from '@/lib/reputation/queries'

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 px-3 py-2.5 text-center">
      <p className="font-display text-xl leading-none tracking-tight tnum sm:text-2xl">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

export function ProfileHero({
  profile,
  rep,
  avatarSlot,
}: {
  profile: Profile
  rep: SellerReputation
  avatarSlot: React.ReactNode
}) {
  const rt = formatResponseTime(rep.response.avgMinutes)
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      {/* gradient banner */}
      <div className="relative h-24 bg-gradient-to-br from-primary to-emerald-800 sm:h-32">
        <div className="absolute -right-8 -top-10 size-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 left-10 size-56 rounded-full bg-gold/15" />
      </div>

      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            {avatarSlot}
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
                  {profile.display_name}
                </h1>
                <VerifiedBadge level={profile.badge_level} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {profile.username && <span>@{profile.username}</span>}
                {profile.emirate && (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="size-3.5" />
                    {emirateLabel(profile.emirate)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDaysIcon className="size-3.5" />
                  Since {memberSince(profile.member_since)}
                </span>
              </div>
              <SellerBadges badges={rep.badges} limit={4} className="mt-2.5" />
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/account/settings">
                <PencilIcon className="size-4" /> Edit profile
              </Link>
            </Button>
            <ShareProfileButton username={profile.username} />
            <Button asChild variant="outline" size="icon" className="size-9 rounded-full" aria-label="Settings">
              <Link href="/account/settings">
                <SettingsIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* stat strip */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          <Stat
            value={
              rep.avgRating != null ? (
                <span className="inline-flex items-center gap-1">
                  {rep.avgRating.toFixed(1)}
                  <Stars value={rep.avgRating} size="size-3" className="hidden sm:inline-flex" />
                </span>
              ) : (
                '—'
              )
            }
            label="Rating"
          />
          <Stat value={rep.reviewCount} label="Reviews" />
          <Stat value={rep.completedSales} label="Sales" />
          <Stat value={rep.activeListings} label="Active" />
          <Stat value={rep.response.rate != null ? `${Math.round(rep.response.rate * 100)}%` : '—'} label="Reply rate" />
          <Stat value={rt ?? '—'} label="Avg reply" />
          <Stat value={0} label="Followers" />
        </div>
      </div>
    </section>
  )
}
