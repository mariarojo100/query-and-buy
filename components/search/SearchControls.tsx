'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'
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

export function SearchControls({
  categories,
  hideCategory = false,
}: {
  categories: CategoryLite[]
  hideCategory?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [q, setQ] = useState(params.get('q') ?? '')
  const [min, setMin] = useState(params.get('min') ?? '')
  const [max, setMax] = useState(params.get('max') ?? '')

  function push(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString())
    mutate(p)
    const qs = p.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }
  const setParam = (key: string, value: string) =>
    push((p) => (value ? p.set(key, value) : p.delete(key)))

  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)
  const childrenOf = (id: string) =>
    categories.filter((c) => c.parent_id === id).sort((a, b) => a.position - b.position)

  const hasFilters = FILTER_KEYS.some((k) => params.has(k))

  return (
    <div className="space-y-3">
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {!hideCategory && (
          <Select
            value={params.get('category') ?? ALL}
            onValueChange={(v) => setParam('category', v === ALL ? '' : v)}
          >
            <SelectTrigger className="w-full">
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
          <SelectTrigger className="w-full">
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
          <SelectTrigger className="w-full">
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
          value={params.get('sort') ?? 'newest'}
          onValueChange={(v) => setParam('sort', v === 'newest' ? '' : v)}
        >
          <SelectTrigger className="w-full">
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

        <Select
          value={params.get('since') ?? ALL}
          onValueChange={(v) => setParam('since', v === ALL ? '' : v)}
        >
          <SelectTrigger className="w-full">
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

        <form
          onSubmit={(e) => {
            e.preventDefault()
            push((p) => {
              if (min) p.set('min', min)
              else p.delete('min')
              if (max) p.set('max', max)
              else p.delete('max')
            })
          }}
          className="col-span-2 flex gap-2 sm:col-span-3 lg:col-span-1"
        >
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="Min AED"
            aria-label="Minimum price"
          />
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Max AED"
            aria-label="Maximum price"
          />
          <Button type="submit" variant="secondary">
            Go
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'negotiable', label: 'Negotiable' },
          { key: 'featured', label: 'Featured' },
        ].map((t) => {
          const on = params.get(t.key) === '1'
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => setParam(t.key, on ? '' : '1')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                on
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          )
        })}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setMin('')
              setMax('')
              router.push(pathname)
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" /> Clear all
          </button>
        )}
      </div>
    </div>
  )
}
