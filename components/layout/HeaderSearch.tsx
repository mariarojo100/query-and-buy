'use client'

import { useEffect, useRef } from 'react'
import { SearchIcon } from 'lucide-react'

/**
 * The persistent, prominent marketplace search in the top bar.
 * Native GET → /?q=… (works without JS); a small "/" shortcut focuses it.
 */
export function HeaderSearch({ className = '' }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Press "/" anywhere (outside a field) to jump into search — a familiar power-user affordance.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement as HTMLElement | null
      const typing =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)
      if (typing) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form action="/" method="get" role="search" className={`group relative ${className}`}>
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        placeholder="Search anything…"
        aria-label="Search the marketplace"
        className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-24 text-sm outline-none transition placeholder:text-muted-foreground/90 hover:border-border focus:border-gold/50 focus:ring-2 focus:ring-gold/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 select-none rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground group-focus-within:opacity-0 lg:block">
        /
      </kbd>
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90"
      >
        <SearchIcon className="size-4" />
      </button>
    </form>
  )
}
