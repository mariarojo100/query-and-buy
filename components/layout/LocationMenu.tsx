'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckIcon, ChevronDownIcon, MapPinIcon } from 'lucide-react'
import { EMIRATES } from '@/lib/profile/emirates'
import { cn } from '@/lib/utils'

/** The location scope control — narrows the marketplace to a single emirate via the existing filter. */
export function LocationMenu({
  className = '',
  variant = 'pill',
}: {
  className?: string
  variant?: 'pill' | 'inline'
}) {
  const params = useSearchParams()
  const active = params.get('emirate')
  const activeLabel = EMIRATES.find((e) => e.value === active)?.label
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const item =
    'flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent'

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 text-sm font-medium text-foreground transition',
          variant === 'pill'
            ? 'h-11 rounded-full border border-border bg-card px-3.5 hover:border-gold/40'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <MapPinIcon className="size-4 text-gold" />
        <span className="max-w-[7rem] truncate">{activeLabel ?? 'UAE'}</span>
        <ChevronDownIcon
          className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-float animate-in fade-in-0 slide-in-from-top-1 duration-150"
        >
          <Link href="/" role="menuitem" onClick={() => setOpen(false)} className={item}>
            <span>All of UAE</span>
            {!active && <CheckIcon className="size-4 text-gold" />}
          </Link>
          <div className="my-1 h-px bg-border" />
          {EMIRATES.map((e) => (
            <Link
              key={e.value}
              href={`/?emirate=${e.value}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={item}
            >
              <span>{e.label}</span>
              {active === e.value && <CheckIcon className="size-4 text-gold" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
