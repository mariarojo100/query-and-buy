import {
  type LucideIcon,
  PackageIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  UserPlusIcon,
} from 'lucide-react'
import { ActivityIcon as TimelineIcon } from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import { EmptyState } from '@/components/common/EmptyState'
import type { ActivityEvent, ActivityKind } from '@/lib/account/activity'

const ICONS: Record<ActivityKind, LucideIcon> = {
  joined: UserPlusIcon,
  listed: PackageIcon,
  featured: SparklesIcon,
  sold: TrophyIcon,
  review: StarIcon,
}

const TONE: Record<ActivityKind, string> = {
  joined: 'bg-muted text-muted-foreground',
  listed: 'bg-primary/10 text-primary',
  featured: 'bg-gold/15 text-foreground',
  sold: 'bg-success/10 text-success',
  review: 'bg-gold/15 text-foreground',
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={TimelineIcon}
        title="No activity yet"
        description="Your listings, sales, and reviews will appear here as you use the marketplace."
      />
    )
  }
  return (
    <ol className="relative space-y-5 pl-2">
      <span className="absolute bottom-2 left-[1.45rem] top-2 w-px bg-border" aria-hidden />
      {events.map((e) => {
        const Icon = ICONS[e.kind]
        return (
          <li key={e.id} className="relative flex items-start gap-3.5">
            <span
              className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${TONE[e.kind]}`}
            >
              <Icon className="size-4" />
            </span>
            <div className="pt-1.5">
              <p className="text-sm text-foreground">{e.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatRelativeTime(e.at)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
