import {
  BadgeCheckIcon,
  type LucideIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SproutIcon,
  StarIcon,
  TrophyIcon,
  ZapIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BadgeKey, SellerBadge } from '@/lib/reputation/badges'

const ICONS: Record<BadgeKey, LucideIcon> = {
  top_rated: TrophyIcon,
  ten_sales: StarIcon,
  trusted: ShieldCheckIcon,
  fast_responder: ZapIcon,
  verified: BadgeCheckIcon,
  ai_photos: SparklesIcon,
  new_seller: SproutIcon,
}

const TONE: Record<SellerBadge['tone'], string> = {
  emerald: 'bg-primary/10 text-primary border-primary/20',
  gold: 'bg-gold/15 text-foreground border-gold/30',
  slate: 'bg-muted text-muted-foreground border-border',
}

export function SellerBadges({
  badges,
  limit,
  className,
}: {
  badges: SellerBadge[]
  limit?: number
  className?: string
}) {
  const shown = limit ? badges.slice(0, limit) : badges
  if (shown.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {shown.map((b) => {
        const Icon = ICONS[b.key]
        return (
          <span
            key={b.key}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              TONE[b.tone],
            )}
          >
            <Icon className="size-3" />
            {b.label}
          </span>
        )
      })}
    </div>
  )
}
