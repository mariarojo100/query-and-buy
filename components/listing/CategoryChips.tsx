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
    <div className="flex gap-2 overflow-x-auto pb-1">
      {parents.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition hover:bg-muted ${
            c.slug === activeSlug ? 'bg-foreground text-background' : 'bg-card'
          }`}
        >
          {c.name_en}
        </Link>
      ))}
    </div>
  )
}
