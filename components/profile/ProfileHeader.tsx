import { CalendarDaysIcon, MapPinIcon, PackageIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import { emirateLabel } from '@/lib/profile/emirates'
import type { Profile } from '@/lib/profile/completion'

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function joinedLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Shared profile header (trust surface). Used on the owner dashboard and the
 * public /u/[username] page. `slot` lets the dashboard swap the static avatar
 * for the interactive uploader.
 */
export function ProfileHeader({
  profile,
  avatarSlot,
}: {
  profile: Profile
  avatarSlot?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      {avatarSlot ?? (
        <Avatar className="size-24 sm:size-28">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
          <AvatarFallback className="text-2xl">
            {initials(profile.display_name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 space-y-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {profile.display_name}
          </h1>
          <VerifiedBadge level={profile.badge_level} />
        </div>

        {profile.username && (
          <p className="text-muted-foreground">@{profile.username}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
          {profile.emirate && (
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-4" />
              {emirateLabel(profile.emirate)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <PackageIcon className="size-4" />
            {profile.listings_count} {profile.listings_count === 1 ? 'listing' : 'listings'}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="size-4" />
            Joined {joinedLabel(profile.member_since)}
          </span>
        </div>
      </div>
    </div>
  )
}
