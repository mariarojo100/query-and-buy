import Link from 'next/link'
import { EMIRATES } from '@/lib/profile/emirates'

/**
 * "Browse by city" internal-link row shown on category and city landing pages.
 * Builds the crawlable mesh between /[slug] and /[slug]/[city]
 * that lets the city pages accumulate internal links and get discovered.
 */
export function CityLinks({
  categorySlug,
  categoryName,
  activeCity,
}: {
  categorySlug: string
  categoryName: string
  activeCity?: string | null
}) {
  return (
    <section aria-label={`Browse ${categoryName} by city`}>
      <p className="eyebrow">Browse by city</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EMIRATES.map((e) => {
          const active = e.slug === activeCity
          return (
            <Link
              key={e.slug}
              href={`/${categorySlug}/${e.slug}`}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded-full border border-foreground bg-foreground px-3 py-1 text-sm text-background'
                  : 'rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition hover:border-foreground hover:text-foreground'
              }
            >
              {categoryName} in {e.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
