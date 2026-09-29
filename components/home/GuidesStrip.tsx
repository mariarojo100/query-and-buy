import Link from 'next/link'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import { BEACON_GUIDES } from '@/lib/guides/beacon.generated'
import { guideReadMinutes } from '@/lib/guides/guides'

/**
 * The newest buyer guides, linked straight from the homepage. The homepage is the
 * most-crawled page on the site, so a direct link is how search engines and AI
 * crawlers find a new guide quickly (the /guides index alone is one hop further).
 * Reads the Beacon-generated guides, so each release shows up here automatically.
 */
export function GuidesStrip({ limit = 4 }: { limit?: number }) {
  const guides = [...BEACON_GUIDES].sort((a, b) => b.published.localeCompare(a.published)).slice(0, limit)
  if (!guides.length) return null
  return (
    <section className="py-6 sm:py-10" aria-labelledby="home-guides">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Buyer guides</p>
          <h2 id="home-guides" className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
            Buy and sell smarter in the UAE
          </h2>
        </div>
        <Link href="/guides" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
          All guides <ArrowRightIcon className="size-4" />
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-soft"
            >
              <p className="eyebrow">{g.eyebrow}</p>
              <h3 className="font-display mt-1.5 text-lg leading-snug tracking-tight text-foreground">{g.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{g.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3.5" /> {guideReadMinutes(g.slug)} min read
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
