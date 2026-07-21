import Link from 'next/link'
import { ChevronDownIcon } from 'lucide-react'
import type { CategoryLite } from '@/lib/listings/queries'

/** The secondary marketplace nav — top-level categories as a quiet strip under the header. */
export function CategoryNav({ categories }: { categories: CategoryLite[] }) {
  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)
    .slice(0, 8)

  if (parents.length === 0) return null

  const link =
    'shrink-0 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground'

  return (
    <nav
      aria-label="Categories"
      className="hidden border-t border-border/60 md:block"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {parents.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} className={link}>
            {c.name_en}
          </Link>
        ))}
        <Link href="/?sort=newest" className={`${link} inline-flex items-center gap-0.5`}>
          More
          <ChevronDownIcon className="size-3.5" />
        </Link>
      </div>
    </nav>
  )
}
