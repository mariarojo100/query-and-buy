import Link from 'next/link'
import { HeartIcon, MessageSquareIcon, TagIcon } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { getViewer } from '@/lib/auth/session'
import { profileHeader } from '@/lib/db/profiles'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { getUnreadConversationCount } from '@/lib/messaging/queries'
import { getNotifications, getUnreadNotificationCount } from '@/lib/notifications/queries'
import { getTrendingSearches } from '@/lib/search/intelligence'

/** Marketplace top bar: brand · location · search, then the category strip below. */
export async function SiteHeader() {
  const user = await getViewer()
  const trending = await getTrendingSearches(6)

  let avatarUrl: string | null = null
  let displayName = ''
  let unread = 0
  let notifications: Awaited<ReturnType<typeof getNotifications>> = []
  let notifUnread = 0
  if (user) {
    // A brand-new user's profile may lag by a beat — never crash the navbar; fall back to email.
    const data = await profileHeader(user.id)
    avatarUrl = data?.avatar_url ?? null
    displayName = data?.display_name ?? user.email ?? 'Account'
    ;[unread, notifications, notifUnread] = await Promise.all([
      getUnreadConversationCount(),
      getNotifications(12),
      getUnreadNotificationCount(),
    ])
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="Query & Buy home" className="flex shrink-0 items-center gap-2">
          <Logo size={34} />
        </Link>

        {/* Persistent search — discovery from any page. */}
        <div className="mx-2 hidden min-w-0 max-w-2xl flex-1 md:block">
          <SmartSearchBox trending={trending.map((t) => t.query)} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          {user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Favorites"
                className="hidden sm:inline-flex"
              >
                <Link href="/favorites">
                  <HeartIcon className="size-5" />
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
                className="relative"
              >
                <Link href="/messages">
                  <MessageSquareIcon className="size-5" />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
              </Button>

              <NotificationBell userId={user.id} items={notifications} unreadCount={notifUnread} />

              <Button
                asChild
                size="sm"
                className="hidden rounded-full bg-gold px-4 font-semibold text-gold-foreground shadow-soft hover:bg-gold/90 sm:inline-flex"
              >
                <Link href="/sell">
                  <TagIcon className="size-4" strokeWidth={2} />
                  Sell
                </Link>
              </Button>

              <Link href="/account" aria-label="Account" className="ml-1">
                <Avatar className="size-9 ring-1 ring-border transition hover:ring-gold/50">
                  <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                  <AvatarFallback className="text-xs">{initials(displayName)}</AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                className="hidden rounded-full bg-gold px-4 font-semibold text-gold-foreground shadow-soft hover:bg-gold/90 sm:inline-flex"
              >
                <Link href="/sell">
                  <TagIcon className="size-4" strokeWidth={2} />
                  Sell
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full px-5">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
