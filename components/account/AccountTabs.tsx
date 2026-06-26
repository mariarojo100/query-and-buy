'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type Tab = { label: string; href: string; active: (path: string, sp: URLSearchParams) => boolean }

const TABS: Tab[] = [
  { label: 'Overview', href: '/account', active: (p) => p === '/account' },
  {
    label: 'Listings',
    href: '/account/listings',
    active: (p, sp) => p === '/account/listings' && sp.get('status') !== 'sold',
  },
  {
    label: 'Sold',
    href: '/account/listings?status=sold',
    active: (p, sp) => p === '/account/listings' && sp.get('status') === 'sold',
  },
  { label: 'Orders', href: '/account/orders', active: (p) => p.startsWith('/account/orders') },
  { label: 'Purchases', href: '/account/purchases', active: (p) => p.startsWith('/account/purchases') },
  { label: 'Reviews', href: '/account/reviews', active: (p) => p.startsWith('/account/reviews') },
  { label: 'Wishlist', href: '/account/wishlist', active: (p) => p.startsWith('/account/wishlist') },
  { label: 'Saved searches', href: '/account/saved', active: (p) => p.startsWith('/account/saved') },
  { label: 'Settings', href: '/account/settings', active: (p) => p.startsWith('/account/settings') },
]

export function AccountTabs() {
  const pathname = usePathname()
  const sp = useSearchParams()

  return (
    <div className="sticky top-16 z-20 -mx-5 mt-6 border-b border-border bg-background/80 px-5 backdrop-blur-xl sm:-mx-8 sm:px-8">
      <nav className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = t.active(pathname, sp)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'group relative shrink-0 whitespace-nowrap px-3.5 py-3 text-sm transition-colors',
                active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'absolute inset-x-2 -bottom-px h-0.5 origin-center rounded-full bg-primary transition-transform duration-300',
                  active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50 group-hover:bg-border',
                )}
              />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
