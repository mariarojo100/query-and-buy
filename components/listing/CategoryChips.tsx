import Link from 'next/link'
import type { CategoryLite } from '@/lib/listings/queries'

/** Horizontal scroll of top-level categories → /category/[slug]. */
export function CategoryChips({
  categories,
  activeSlug,
}: {
  categories: CategoryLite[]
  activeSlug?: string
}) {
  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)

  if (parents.length === 0) return null

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {parents.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
            c.slug === activeSlug
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:border-gold/40 hover:text-foreground'
          }`}
        >
          {c.name_en}
        </Link>
      ))}
    </div>
  )
}
