import { CalendarDaysIcon, GlobeIcon, MapPinIcon, MessageCircleIcon, type LucideIcon } from 'lucide-react'
import { emirateLabel } from '@/lib/profile/emirates'
import { formatResponseTime } from '@/lib/reputation/badges'
import { CardHeading } from '@/components/account/CardHeading'
import type { Profile } from '@/lib/profile/completion'

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-gold">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="mt-0.5 text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function AboutCard({ profile, avgReplyMinutes }: { profile: Profile; avgReplyMinutes: number | null }) {
  const location = (profile.emirate && emirateLabel(profile.emirate)) || 'UAE'
  const since = new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const reply = formatResponseTime(avgReplyMinutes)

  return (
    <div className="h-full rounded-3xl border border-border bg-card p-5 shadow-soft">
      <CardHeading>About</CardHeading>
      <div className="mt-4 space-y-4">
        <Row icon={MapPinIcon} label="Location" value={location} />
        <Row icon={CalendarDaysIcon} label="Member since" value={since} />
        <Row icon={MessageCircleIcon} label="Response time" value={reply ? `Replies in ${reply}` : 'New seller'} />
        <Row icon={GlobeIcon} label="Languages" value="English" />
      </div>
    </div>
  )
}
