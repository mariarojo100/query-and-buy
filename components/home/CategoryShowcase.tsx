import Link from 'next/link'
import {
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
            className="lift group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-float"
          >
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-accent/60 transition-transform duration-500 group-hover:scale-125" />
            <div className="relative">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
                <Icon className="size-5" />
              </span>
              <p className="font-display mt-4 text-base leading-tight">{c.name_en}</p>
              <p className="eyebrow mt-1.5">
                {n > 0 ? `${n.toLocaleString('en-AE')} listing${n === 1 ? '' : 's'}` : 'Explore'}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
