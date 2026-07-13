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
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Help Center', href: '/help' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
]

const SOCIALS = [
  { label: 'Instagram', href: '#' },
  { label: 'X', href: '#' },
  { label: 'Facebook', href: '#' },
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
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
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

        <div className="mt-12 border-t border-border pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
              <Link href="/cookies" className="transition-colors hover:text-foreground">
                Cookies
              </Link>
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                Beta
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="transition-colors hover:text-foreground"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            © {year} Query &amp; Buy. All rights reserved. Made for the United Arab Emirates.
          </p>
        </div>
      </div>
    </footer>
  )
}
