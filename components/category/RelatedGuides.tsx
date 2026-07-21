import Link from 'next/link'
import { guidesForCategory } from '@/lib/guides/guides'

/**
 * "Helpful guides" block for category / category-in-city pages. Links relevant
 * guide articles so they get internal links from higher-authority pages (aiding
 * discovery + indexing) and gives shoppers useful next reading.
 */
export function RelatedGuides({ categorySlug }: { categorySlug: string }) {
  const guides = guidesForCategory(categorySlug)
  if (guides.length === 0) return null

  return (
    <section aria-label="Helpful guides" className="mt-10 border-t border-border pt-8">
      <p className="eyebrow">Helpful guides</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group block rounded-lg border border-border p-4 transition-shadow hover:shadow-soft"
            >
              <span className="block text-sm font-medium text-foreground">{g.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {g.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
