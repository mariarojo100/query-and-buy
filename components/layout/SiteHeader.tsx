import Link from 'next/link'
import { MessageSquareIcon, PlusIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { getUnreadConversationCount } from '@/lib/messaging/queries'

/** Top app bar. Auth-aware: shows account avatar when signed in, else Log in. */
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
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Query<span className="text-muted-foreground">&amp;</span>Buy
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/sell">
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">Sell</span>
            </Link>
          </Button>

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
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {user ? (
            <Link href="/account" aria-label="Account">
              <Avatar className="size-8 ring-1 ring-border">
                <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="text-xs">{initials(displayName)}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
