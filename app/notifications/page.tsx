import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BellIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { MarkAllReadButton } from '@/components/notifications/MarkAllReadButton'
import { getNotifications } from '@/lib/notifications/queries'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Notifications · Query & Buy' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/notifications')

  const items = await getNotifications(50)
  const hasUnread = items.some((n) => !n.read_at)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8 sm:px-6 sm:py-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Activity</p>
            <h1 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">Notifications</h1>
          </div>
          {hasUnread && <MarkAllReadButton />}
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={BellIcon}
            title="No notifications yet"
            description="Offers, confirmations, sales, and reviews will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {items.map((n) => {
              const inner = (
                <div
                  className={cn(
                    'flex gap-3 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-accent/40',
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
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              )
              return n.link ? (
                <Link key={n.id} href={n.link} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              )
            })}
          </div>
        )}

        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account">Back to account</Link>
          </Button>
        </div>
      </main>
    </>
  )
}
