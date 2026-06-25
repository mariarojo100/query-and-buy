import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { formatChatTime } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import type { InboxItem } from '@/lib/messaging/queries'

export function ConversationListItem({ item }: { item: InboxItem }) {
  const otherName = item.other?.display_name ?? 'Unknown user'
  const title = item.listing?.title_en ?? 'Listing no longer available'
  const unread = item.unreadCount > 0

  return (
    <Link
      href={`/messages/${item.id}`}
      className={`flex items-center gap-3 p-3 transition hover:bg-muted/50 ${unread ? 'bg-primary/5' : ''}`}
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {item.listing?.cover_key ? (
          <Image
            src={publicUrl(LISTING_IMAGES_BUCKET, item.listing.cover_key)}
            alt={title}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-5 opacity-40" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${unread ? 'font-semibold' : 'font-medium'}`}>
            {title}
          </span>
          {item.lastAt && (
            <span
              className={`shrink-0 text-xs ${unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              {formatChatTime(item.lastAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Avatar className="size-4">
            <AvatarImage src={item.other?.avatar_url ?? undefined} alt={otherName} />
            <AvatarFallback className="text-[8px]">{initials(otherName)}</AvatarFallback>
          </Avatar>
          <span className="shrink-0 text-xs text-muted-foreground">{otherName}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
          >
            {item.lastBody ?? 'No messages yet'}
          </p>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
