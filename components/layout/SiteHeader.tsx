import Link from 'next/link'
import { HeartIcon, MessageSquareIcon, SearchIcon } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { getViewer } from '@/lib/auth/session'
import { profileHeader } from '@/lib/db/profiles'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { getUnreadConversationCount } from '@/lib/messaging/queries'
import { getNotifications, getUnreadNotificationCount } from '@/lib/notifications/queries'

/** Quiet, editorial top bar. Primary nav on mobile lives in the bottom tab bar. */
export async function SiteHeader() {
  const user = await getViewer()

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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="Query & Buy home" className="shrink-0">
          <Logo size={34} />
        </Link>

        {/* Persistent search — discovery from any page. Native GET form → /?q=…
            (no client JS). Mobile relies on the bottom nav + home search. */}
        <form
          action="/"
          method="get"
          role="search"
          className="relative mx-4 hidden min-w-0 max-w-md flex-1 md:block"
        >
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            placeholder="Search Query & Buy"
            aria-label="Search the marketplace"
            className="h-10 w-full rounded-full border border-border bg-card/60 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-gold/40 focus:bg-card focus:ring-1 focus:ring-gold/30"
          />
        </form>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link
            href="/"
            className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:block"
          >
            Browse
          </Link>

          <ThemeToggle />

          {user && (
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
          )}

          {user && (
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
          )}

          {user && (
            <NotificationBell userId={user.id} items={notifications} unreadCount={notifUnread} />
          )}

          <Button asChild size="sm" className="hidden rounded-full px-5 sm:inline-flex">
            <Link href="/sell">Sell</Link>
          </Button>

          {user ? (
            <Link href="/account" aria-label="Account" className="ml-1">
              <Avatar className="size-9 ring-1 ring-border transition hover:ring-gold/50">
                <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="text-xs">{initials(displayName)}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
