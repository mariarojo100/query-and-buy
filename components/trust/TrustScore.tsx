import type { TrustResult } from '@/lib/trust/score'
import { cn } from '@/lib/utils'

const TIER_FILL: Record<TrustResult['tier'], string> = {
  trusted: 'bg-primary',
  rising: 'bg-gold',
  new: 'bg-muted-foreground/50',
}

/** Elegant trust readout: serif numeral, tier eyebrow, tinted progress meter. */
export function TrustScore({ trust }: { trust: TrustResult }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display tnum text-2xl leading-none">{trust.score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </span>
        <span className="eyebrow">{trust.tierLabel}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={trust.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Trust score ${trust.score} out of 100 — ${trust.tierLabel}`}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', TIER_FILL[trust.tier])}
          style={{ width: `${trust.score}%` }}
        />
      </div>
    </div>
  )
}
