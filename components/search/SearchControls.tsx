'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EMIRATES } from '@/lib/profile/emirates'
import { CONDITIONS } from '@/lib/listings/conditions'
import type { CategoryLite } from '@/lib/listings/queries'

const ALL = '__all__'
const FILTER_KEYS = [
  'q',
  'category',
  'emirate',
  'condition',
  'min',
  'max',
  'sort',
  'since',
  'negotiable',
  'featured',
]
// Only these count toward the "Filters" badge (q + sort are surfaced elsewhere).
const REFINE_KEYS = ['category', 'emirate', 'condition', 'min', 'max', 'since', 'negotiable', 'featured']
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'most_viewed', label: 'Most viewed' },
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'featured_first', label: 'Featured first' },
]
const DATES = [
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
]

const money = (v: string) => Number(v).toLocaleString('en-AE')

export function SearchControls({
  categories,
  hideCategory = false,
  hideSearch = false,
}: {
  categories: CategoryLite[]
  hideCategory?: boolean
  /** Omit the text search field — used where a primary search box sits above. */
  hideSearch?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [q, setQ] = useState(params.get('q') ?? '')
  const [min, setMin] = useState(params.get('min') ?? '')
  const [max, setMax] = useState(params.get('max') ?? '')
  const [open, setOpen] = useState(false)

  function push(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString())
    mutate(p)
    const qs = p.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }
  const setParam = (key: string, value: string) =>
    push((p) => (value ? p.set(key, value) : p.delete(key)))

  const applyPrice = () =>
    push((p) => {
      if (min) p.set('min', min)
      else p.delete('min')
      if (max) p.set('max', max)
      else p.delete('max')
    })
  const onPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyPrice()
    }
  }

  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)
  const childrenOf = (id: string) =>
    categories.filter((c) => c.parent_id === id).sort((a, b) => a.position - b.position)
  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name_en ?? slug

  const hasFilters = FILTER_KEYS.some((k) => params.has(k))
  const refineCount = REFINE_KEYS.filter((k) => params.has(k)).length

  // Active refinements as removable chips — the user sees exactly what's narrowing results.
  const minV = params.get('min')
  const maxV = params.get('max')
  const priceChip =
    minV && maxV
      ? `AED ${money(minV)}–${money(maxV)}`
      : minV
        ? `AED ${money(minV)}+`
        : maxV
          ? `Under AED ${money(maxV)}`
          : null

  type Chip = { label: string; clear: () => void }
  const chips: Chip[] = []
  const catV = params.get('category')
  if (catV) chips.push({ label: categoryName(catV), clear: () => setParam('category', '') })
  const emV = params.get('emirate')
  if (emV) chips.push({ label: EMIRATES.find((e) => e.value === emV)?.label ?? emV, clear: () => setParam('emirate', '') })
  const condV = params.get('condition')
  if (condV) chips.push({ label: CONDITIONS.find((c) => c.value === condV)?.label ?? condV, clear: () => setParam('condition', '') })
  if (priceChip)
    chips.push({
      label: priceChip,
      clear: () => {
        setMin('')
        setMax('')
        push((p) => {
          p.delete('min')
          p.delete('max')
        })
      },
    })
  const sinceV = params.get('since')
  if (sinceV) chips.push({ label: DATES.find((d) => d.value === sinceV)?.label ?? sinceV, clear: () => setParam('since', '') })
  if (params.get('negotiable') === '1') chips.push({ label: 'Negotiable', clear: () => setParam('negotiable', '') })
  if (params.get('featured') === '1') chips.push({ label: 'Featured', clear: () => setParam('featured', '') })

  const clearAll = () => {
    setQ('')
    setMin('')
    setMax('')
    setOpen(false)
    router.push(pathname)
  }

  const triggerCls = 'w-full'

  return (
    <div className="space-y-3">
      {!hideSearch && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setParam('q', q.trim())
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search listings…"
              className="pl-9"
              aria-label="Search listings"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      )}

      {/* Control bar — sort stays out; everything else lives behind one Filters toggle. */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={params.get('sort') ?? 'newest'}
          onValueChange={(v) => setParam('sort', v === 'newest' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[150px] rounded-full" aria-label="Sort">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition',
            open || refineCount > 0
              ? 'border-foreground/20 bg-accent/60 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          <SlidersHorizontalIcon className="size-4" />
          Filters
          {refineCount > 0 && (
            <span className="tnum inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {refineCount}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full px-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <XIcon className="size-3.5" /> Clear all
          </button>
        )}
      </div>

      {/* Active refinements — visible and individually removable. */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.clear}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-2 text-xs font-medium text-foreground shadow-soft transition hover:border-foreground/25"
            >
              {c.label}
              <XIcon className="size-3.5 text-muted-foreground transition group-hover:text-foreground" />
            </button>
          ))}
        </div>
      )}

      {/* Advanced panel — collapsed by default so the results lead, not the controls. */}
      {open && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft duration-150">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {!hideCategory && (
              <Select
                value={params.get('category') ?? ALL}
                onValueChange={(v) => setParam('category', v === ALL ? '' : v)}
              >
                <SelectTrigger className={triggerCls}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {parents.map((p) => {
                    const kids = childrenOf(p.id)
                    return kids.length > 0 ? (
                      <SelectGroup key={p.id}>
                        <SelectLabel>{p.name_en}</SelectLabel>
                        {kids.map((k) => (
                          <SelectItem key={k.id} value={k.slug}>
                            {k.name_en}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : (
                      <SelectItem key={p.id} value={p.slug}>
                        {p.name_en}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}

            <Select
              value={params.get('emirate') ?? ALL}
              onValueChange={(v) => setParam('emirate', v === ALL ? '' : v)}
            >
              <SelectTrigger className={triggerCls}>
                <SelectValue placeholder="Emirate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All emirates</SelectItem>
                {EMIRATES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.get('condition') ?? ALL}
              onValueChange={(v) => setParam('condition', v === ALL ? '' : v)}
            >
              <SelectTrigger className={triggerCls}>
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any condition</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.get('since') ?? ALL}
              onValueChange={(v) => setParam('since', v === ALL ? '' : v)}
            >
              <SelectTrigger className={triggerCls}>
                <SelectValue placeholder="Date posted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any time</SelectItem>
                {DATES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                AED
              </span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                onKeyDown={onPriceKeyDown}
                placeholder="Min price"
                aria-label="Minimum price in AED"
                className="pl-11 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                AED
              </span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                onKeyDown={onPriceKeyDown}
                placeholder="Max price"
                aria-label="Maximum price in AED"
                className="pl-11 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <Button type="button" onClick={applyPrice} variant="outline" className="col-span-2 sm:col-span-1">
              Apply price
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              { key: 'negotiable', label: 'Negotiable only' },
              { key: 'featured', label: 'Featured only' },
            ].map((t) => {
              const on = params.get(t.key) === '1'
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setParam(t.key, on ? '' : '1')}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    on
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
