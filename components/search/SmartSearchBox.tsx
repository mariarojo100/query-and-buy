'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClockIcon,
  LayersIcon,
  Loader2Icon,
  PackageIcon,
  SearchIcon,
  SparklesIcon,
  TrendingUpIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getSuggestions, parseConversationalSearch } from '@/app/search/actions'
import { buildSearchHref } from '@/lib/savedSearches/filters'
import type { Suggestion } from '@/lib/search/intelligence'

const RECENT_KEY = 'qb:recent-searches'
const RECENT_MAX = 8

type Option =
  | { kind: 'recent' | 'trending' | 'query'; label: string; run: string }
  | { kind: 'category'; label: string; href: string }
  | { kind: 'listing'; label: string; href: string }

function loadRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function SmartSearchBox({ trending = [] }: { trending?: string[] }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setRecent(loadRecent()), [])

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Debounced suggestions fetch.
  useEffect(() => {
    const t = text.trim()
    if (debounce.current) clearTimeout(debounce.current)
    if (t.length < 2) {
      setSuggestions([])
      return
    }
    debounce.current = setTimeout(async () => {
      try {
        setSuggestions(await getSuggestions(t))
      } catch {
        setSuggestions([])
      }
    }, 160)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [text])

  function pushRecent(q: string) {
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX)
    setRecent(next)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  function clearRecent() {
    setRecent([])
    try {
      localStorage.removeItem(RECENT_KEY)
    } catch {
      /* ignore */
    }
  }

  async function run(value: string) {
    const t = value.trim()
    if (!t || loading) return
    setOpen(false)
    setLoading(true)
    pushRecent(t)
    try {
      const res = await parseConversationalSearch(t)
      if (res.aiUsed) toast.success('Search understood — filters applied below.')
      router.push(buildSearchHref(res.query, res.filters))
    } catch {
      router.push(buildSearchHref(t, {}))
    } finally {
      setLoading(false)
    }
  }

  // The flat, keyboard-navigable option list for the current dropdown state.
  const options = useMemo<Option[]>(() => {
    const typing = text.trim().length >= 2
    if (typing) {
      return suggestions.map((s): Option =>
        s.type === 'category'
          ? { kind: 'category', label: s.label, href: `/category/${s.slug}` }
          : s.type === 'listing'
            ? { kind: 'listing', label: s.label, href: `/listing/${s.id}` }
            : { kind: 'query', label: s.label, run: s.label },
      )
    }
    return [
      ...recent.map((r): Option => ({ kind: 'recent', label: r, run: r })),
      ...trending.map((t): Option => ({ kind: 'trending', label: t, run: t })),
    ]
  }, [text, suggestions, recent, trending])

  function select(opt: Option) {
    if (opt.kind === 'category' || opt.kind === 'listing') {
      setOpen(false)
      router.push(opt.href)
    } else {
      setText(opt.label)
      run(opt.run)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && options[active]) select(options[active])
      else run(text)
    }
  }

  const showDropdown = open && (options.length > 0 || (text.trim().length >= 2))
  const ICON = {
    recent: ClockIcon,
    trending: TrendingUpIcon,
    query: SearchIcon,
    category: LayersIcon,
    listing: PackageIcon,
  }

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (active >= 0 && options[active]) select(options[active])
          else run(text)
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-soft transition focus-within:border-gold/40 focus-within:ring-1 focus-within:ring-gold/30"
      >
        <SparklesIcon className="size-4 shrink-0 text-gold" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setActive(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search naturally — “iPhone under AED 2000 in Dubai”"
          aria-label="Search the marketplace"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" disabled={loading || !text.trim()} className="shrink-0 rounded-full px-5">
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-float animate-in fade-in-0 slide-in-from-top-1 duration-150"
        >
          {text.trim().length < 2 && recent.length > 0 && (
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <p className="eyebrow">Recent</p>
              <button
                type="button"
                onClick={clearRecent}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear history
              </button>
            </div>
          )}
          {text.trim().length >= 2 && options.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              No matches — press Enter to search “{text.trim()}”.
            </p>
          )}
          <ul className="max-h-80 overflow-y-auto py-1">
            {options.map((opt, i) => {
              const Icon = ICON[opt.kind]
              return (
                <li key={`${opt.kind}-${opt.label}-${i}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(opt)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                      i === active ? 'bg-accent' : 'hover:bg-accent/50',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{opt.label}</span>
                    <span className="ml-auto shrink-0 text-[11px] capitalize text-muted-foreground">
                      {opt.kind === 'listing' ? 'Listing' : opt.kind === 'category' ? 'Category' : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
