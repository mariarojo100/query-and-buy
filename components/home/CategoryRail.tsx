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
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { BLUR_DATA_URL } from '@/lib/blur'
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

/**
 * Image-led category tiles — each shows a real photo from a recent listing in
 * that category (falls back to a warm icon tile when none is available).
 * `covers` maps a parent slug → a representative listing cover key.
 */
export function CategoryRail({
  categories,
  covers = {},
}: {
  categories: CategoryLite[]
  covers?: Record<string, string>
}) {
  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)
    .slice(0, 9)

  if (parents.length === 0) return null

  const tile =
    'group relative aspect-[5/4] overflow-hidden rounded-2xl bg-muted shadow-soft ring-1 ring-inset ring-foreground/[0.06] transition duration-200 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {parents.map((c) => {
        const Icon = ICONS[c.slug] ?? TagIcon
        const cover = covers[c.slug]
        return (
          <Link key={c.id} href={`/${c.slug}`} className={tile}>
            {cover ? (
              <>
                <SafeListingImage
                  src={publicUrl(LISTING_IMAGES_BUCKET, cover)}
                  alt={c.name_en}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-3 text-sm font-medium text-white">
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{c.name_en}</span>
                </span>
              </>
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent via-card to-secondary/60 p-2 text-center">
                <Icon className="size-6 text-gold" strokeWidth={1.6} />
                <span className="line-clamp-2 text-[13px] font-medium leading-tight text-foreground/85">
                  {c.name_en}
                </span>
              </span>
            )}
          </Link>
        )
      })}
      <Link href="/?sort=newest" className={tile}>
        <span className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent via-card to-secondary/60 text-center">
          <MoreHorizontalIcon className="size-6 text-gold" strokeWidth={1.6} />
          <span className="text-[13px] font-medium text-foreground/85">More</span>
        </span>
      </Link>
    </div>
  )
}
