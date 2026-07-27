import Link from 'next/link'
import {
  Building2Icon,
  CarIcon,
  Gamepad2Icon,
  LaptopIcon,
  type LucideIcon,
  MoreHorizontalIcon,
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

/** A single scannable row of category tiles — icon + label, plus a "More" tile. */
export function CategoryRail({ categories }: { categories: CategoryLite[] }) {
  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)
    .slice(0, 9)

  if (parents.length === 0) return null

  const tile =
    'group flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card px-2 py-4 text-center shadow-soft transition duration-200 hover:border-gold/40 hover:shadow-float focus-visible:border-gold/40 focus-visible:outline-none'

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
      {parents.map((c) => {
        const Icon = ICONS[c.slug] ?? TagIcon
        return (
          <Link key={c.id} href={`/${c.slug}`} className={tile}>
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/[0.06] text-primary ring-1 ring-inset ring-primary/10 transition-colors duration-200 group-hover:bg-gold/15 group-hover:text-gold group-hover:ring-gold/20">
              <Icon className="size-[22px]" strokeWidth={1.6} />
            </span>
            <span className="line-clamp-2 text-[13px] font-medium leading-tight text-foreground/85">
              {c.name_en}
            </span>
          </Link>
        )
      })}
      <Link href="/?sort=newest" className={tile}>
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/[0.06] text-primary ring-1 ring-inset ring-primary/10 transition-colors duration-200 group-hover:bg-gold/15 group-hover:text-gold group-hover:ring-gold/20">
          <MoreHorizontalIcon className="size-[22px]" strokeWidth={1.6} />
        </span>
        <span className="text-[13px] font-medium leading-tight text-foreground/85">More</span>
      </Link>
    </div>
  )
}
