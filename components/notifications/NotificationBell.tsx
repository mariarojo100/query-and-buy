'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BellIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/format'
import { markNotificationRead, markAllNotificationsRead } from '@/app/notifications/actions'
import type { AppNotification } from '@/lib/notifications/queries'

export function NotificationBell({
  userId,
  items,
  unreadCount,
}: {
  userId: string
  items: AppNotification[]
  unreadCount: number
}) {
  const router = useRouter()
  const [, start] = useTransition()

  // Realtime: refresh the header when a new notification arrives.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, router])

  function openItem(n: AppNotification) {
    if (!n.read_at) start(async () => {
      await markNotificationRead(n.id)
      router.refresh()
    })
  }
  function markAll() {
    start(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((n) => {
              const inner = (
                <div
                  className={cn(
                    'flex gap-3 px-3 py-3 transition-colors hover:bg-accent/50',
                    !n.read_at && 'bg-accent/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.read_at ? 'bg-transparent' : 'bg-primary',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              )
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => openItem(n)} className="block">
                  {inner}
                </Link>
              ) : (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className="block w-full text-left"
                >
                  {inner}
                </button>
              )
            })
          )}
        </div>
        <Link
          href="/notifications"
          className="block border-t border-border px-3 py-2.5 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
