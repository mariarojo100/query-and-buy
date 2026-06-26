import Link from 'next/link'
import { BadgeCheckIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react'

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Browse listings', href: '/' },
      { label: 'Start selling', href: '/sell' },
      { label: 'Saved searches', href: '/saved-searches' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { label: 'My listings', href: '/account/listings' },
      { label: 'Favorites', href: '/favorites' },
      { label: 'Messages', href: '/messages' },
      { label: 'Settings', href: '/account' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'Vehicles', href: '/category/vehicles' },
      { label: 'Property', href: '/category/property' },
      { label: 'Electronics', href: '/category/electronics' },
      { label: 'Fashion & Beauty', href: '/category/fashion' },
    ],
  },
]

const TRUST = [
  { icon: BadgeCheckIcon, label: 'Verified sellers' },
  { icon: ShieldCheckIcon, label: 'AI-moderated' },
  { icon: SparklesIcon, label: 'AI-assisted listings' },
]

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl tracking-tight">
              Query <span className="text-muted-foreground">&amp;</span> Buy
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The AI marketplace for the UAE. Snap a photo, let AI do the rest, and sell in seconds.
            </p>
            <ul className="mt-5 space-y-2">
              {TRUST.map((t) => (
                <li key={t.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <t.icon className="size-3.5 text-gold" />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} Query &amp; Buy. All rights reserved.</p>
          <p>Made for the United Arab Emirates</p>
        </div>
      </div>
    </footer>
  )
}
