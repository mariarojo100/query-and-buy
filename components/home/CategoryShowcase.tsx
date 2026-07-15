import Link from 'next/link'
import {
  ArrowUpRightIcon,
  Building2Icon,
  CarIcon,
  Gamepad2Icon,
  LaptopIcon,
  type LucideIcon,
  ShirtIcon,
  SmartphoneIcon,
  SofaIcon,
  TagIcon,
  WrenchIcon,
} from 'lucide-react'
import type { CategoryLite } from '@/lib/listings/queries'

const ICONS: Record<string, LucideIcon> = {
  vehicles: CarIcon,
  property: Building2Icon,
  electronics: LaptopIcon,
  mobiles: SmartphoneIcon,
  'home-garden': SofaIcon,
  fashion: ShirtIcon,
  services: WrenchIcon,
  hobbies: Gamepad2Icon,
  business: Building2Icon,
}

export function CategoryShowcase({
  categories,
  counts,
}: {
  categories: CategoryLite[]
  counts?: Map<string, number>
}) {
  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)
    .slice(0, 8)

  if (parents.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {parents.map((c) => {
        const Icon = ICONS[c.slug] ?? TagIcon
        const n = counts?.get(c.slug) ?? 0
        return (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="lift group relative flex min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-[box-shadow,border-color] duration-300 hover:border-gold/30 hover:shadow-float focus-visible:border-gold/40"
          >
            {/* soft brand wash that warms on hover — subtler than a hard blob */}
            <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-primary/[0.04] blur-xl transition-opacity duration-500 group-hover:opacity-0" />
            <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-gold/[0.10] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-inset ring-primary/10 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <ArrowUpRightIcon className="size-4 -translate-x-0.5 translate-y-0.5 text-muted-foreground/30 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-gold" />
            </div>
            <div className="relative mt-6">
              <p className="font-display text-base leading-snug">{c.name_en}</p>
              <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground tnum">
                {n > 0 ? `${n.toLocaleString('en-AE')} listing${n === 1 ? '' : 's'}` : 'Explore'}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
