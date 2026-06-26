import Link from 'next/link'
import { HeartIcon, MessageSquareIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { getUnreadConversationCount } from '@/lib/messaging/queries'

/** Quiet, editorial top bar. Primary nav on mobile lives in the bottom tab bar. */
export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let avatarUrl: string | null = null
  let displayName = ''
  let unread = 0
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()
    avatarUrl = (data?.avatar_url as string | null) ?? null
    displayName = (data?.display_name as string | null) ?? user.email ?? 'Account'
    unread = await getUnreadConversationCount()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="font-display text-xl tracking-tight">
          Query <span className="text-muted-foreground">&amp;</span> Buy
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5">
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
