'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HeartIcon, HomeIcon, MessageSquareIcon, PlusIcon, UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const HIDE_PREFIXES = ['/login', '/signup', '/auth', '/messages/', '/listing/']

const TABS = [
  { href: '/', label: 'Browse', icon: HomeIcon, match: (p: string) => p === '/' || p.startsWith('/category') || p.startsWith('/listing') },
  { href: '/favorites', label: 'Saved', icon: HeartIcon, match: (p: string) => p.startsWith('/favorites') },
  { href: '/sell', label: 'Sell', icon: PlusIcon, primary: true, match: (p: string) => p.startsWith('/sell') },
  { href: '/messages', label: 'Chats', icon: MessageSquareIcon, match: (p: string) => p === '/messages' },
  { href: '/account', label: 'Account', icon: UserIcon, match: (p: string) => p.startsWith('/account') },
]

/** Premium mobile bottom navigation with a center Sell FAB. Mobile only. */
export function MobileTabBar() {
  const pathname = usePathname()
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return null

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(pathname)
          const Icon = t.icon

          if (t.primary) {
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label="Sell"
                className="flex items-center justify-center"
              >
                <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition active:scale-95">
                  <Icon className="size-6" />
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-5" />
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
