'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3Icon,
  BellIcon,
  FlagIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  MenuIcon,
  PackageIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShoppingCartIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const NAV: { href: string; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/admin/listings', label: 'Listings', icon: PackageIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/moderation', label: 'Moderation', icon: FlagIcon },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCartIcon },
  { href: '/admin/reviews', label: 'Reviews', icon: StarIcon },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3Icon },
  { href: '/admin/categories', label: 'Categories', icon: ListTreeIcon },
  { href: '/admin/ai', label: 'AI Moderation', icon: SparklesIcon },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollTextIcon },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
]

export function AdminShell({ adminName, children }: { adminName: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link href="/admin" className="px-3 py-3" onClick={() => setOpen(false)}>
        <span className="font-display text-lg tracking-tight">
          Query <span className="text-muted-foreground">&amp;</span> Buy
        </span>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Admin
        </span>
      </Link>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
            isActive(item.href)
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
      <div className="mt-auto px-3 pt-3">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(false)}
        >
          ← Back to marketplace
        </Link>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebar}</div>
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card shadow-float">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon className="size-5" />
          </button>
          <button
            className="hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <XIcon className="size-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/notifications"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <BellIcon className="size-5" />
            </Link>
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground sm:block">{adminName}</span>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
