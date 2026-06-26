import type { TrustResult } from '@/lib/trust/score'

/** Elegant trust readout: serif numeral, tier eyebrow, hairline-thin ink meter. */
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
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-500"
          style={{ width: `${trust.score}%` }}
        />
      </div>
    </div>
  )
}
