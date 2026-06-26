import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeftIcon, ImageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { MessageThread } from '@/components/messaging/MessageThread'
import { MessageComposer } from '@/components/messaging/MessageComposer'
import { MarkConversationRead } from '@/components/messaging/MarkConversationRead'
import { ConversationSidebar } from '@/components/messaging/ConversationSidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import {
  getConversationView,
  getConversationMessages,
  getUserConversations,
} from '@/lib/messaging/queries'

export const metadata = { title: 'Conversation · Query & Buy' }

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/messages/${conversationId}`)

  const view = await getConversationView(conversationId)
  if (!view) notFound()

  const [messages, conversations] = await Promise.all([
    getConversationMessages(conversationId),
    getUserConversations(),
  ])
  const otherName = view.other?.display_name ?? 'Unknown user'
  const otherAvatar = view.other?.avatar_url ?? null
  const listing = view.listing

  return (
    <>
      <SiteHeader />
      <MarkConversationRead conversationId={conversationId} />
      <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl overflow-hidden lg:border-x lg:border-border">
        <ConversationSidebar conversations={conversations} activeId={conversationId} />

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Sticky thread header */}
          <div className="flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
            <Link
              href="/messages"
              className="shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
              aria-label="Back to messages"
            >
              <ChevronLeftIcon className="size-5" />
            </Link>

            <Avatar className="size-9 shrink-0">
              <AvatarImage src={otherAvatar ?? undefined} alt={otherName} />
              <AvatarFallback className="text-xs">{initials(otherName)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{otherName}</p>
              {listing ? (
                <Link
                  href={`/listing/${listing.id}`}
                  className="truncate text-xs text-muted-foreground hover:text-foreground"
                >
                  {listing.title_en}
                </Link>
              ) : (
                <p className="truncate text-xs text-muted-foreground">Listing unavailable</p>
              )}
            </div>

            {listing && (
              <Link
                href={`/listing/${listing.id}`}
                className="hidden shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm transition hover:shadow-soft sm:flex"
              >
                <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {listing.cover_key ? (
                    <Image
                      src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
                      alt={listing.title_en}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-4 opacity-40" />
                    </span>
                  )}
                </div>
                <p className="tnum text-sm font-semibold">
                  {formatPrice(listing.price_fils, listing.currency)}
                </p>
              </Link>
            )}
          </div>

          <MessageThread
            messages={messages}
            meId={view.meId}
            otherName={otherName}
            otherAvatarUrl={otherAvatar}
          />
          <MessageComposer conversationId={conversationId} disabled={view.status === 'blocked'} />
        </section>
      </div>
    </>
  )
}
