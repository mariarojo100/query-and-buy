'use client'

import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiPricing } from '@/app/sell/aiActions'

const TIERS = [
  { key: 'quickSaleAed', label: 'Quick sale', hint: 'Sells fast' },
  { key: 'fairMarketAed', label: 'Fair market', hint: 'Typical price' },
  { key: 'premiumAed', label: 'Premium', hint: 'Top of range' },
] as const

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE')}`

export function PriceSuggestions({
  pricing,
  currentPrice,
  onApply,
}: {
  pricing: AiPricing
  currentPrice: string
  onApply: (aed: number) => void
}) {
  const tiers = TIERS.map((t) => ({ ...t, amount: pricing[t.key] })).filter(
    (t): t is typeof t & { amount: number } => t.amount != null,
  )
  if (tiers.length === 0) return null

  const low = pricing.confidence < 70

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">AI price suggestions</p>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            low ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
          )}
        >
          {pricing.confidence}% confidence
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiers.map((t) => {
          const selected = currentPrice !== '' && Number(currentPrice) === t.amount
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onApply(t.amount)}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition hover:border-primary',
                selected ? 'border-primary ring-1 ring-primary' : 'bg-background',
              )}
            >
              <span className="text-[11px] text-muted-foreground">{t.label}</span>
              <span className="text-sm font-semibold">{fmt(t.amount)}</span>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                {selected && <CheckIcon className="size-3 text-primary" />}
                {t.hint}
              </span>
            </button>
          )
        })}
      </div>

      {pricing.reasoning && <p className="text-xs text-muted-foreground">{pricing.reasoning}</p>}
      <p className="text-[11px] text-muted-foreground">
        Tap a price to use it — you can edit it anytime.
      </p>
    </div>
  )
}
