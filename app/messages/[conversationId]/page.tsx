import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeftIcon, ImageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { NegotiationChat, type TimelineItem } from '@/components/orders/NegotiationChat'
import { MarkConversationRead } from '@/components/messaging/MarkConversationRead'
import { ConversationRealtime } from '@/components/realtime/ConversationRealtime'
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
import { getConversationOrder } from '@/lib/orders/queries'
import { getMyReview } from '@/lib/reviews/queries'
import { getSellerReputation } from '@/lib/reputation/queries'
import { SellerBadges } from '@/components/trust/SellerBadges'

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

  const [messages, conversations, { order, offers }] = await Promise.all([
    getConversationMessages(conversationId),
    getUserConversations(),
    getConversationOrder(conversationId),
  ])
  const otherName = view.other?.display_name ?? 'Unknown user'
  const otherAvatar = view.other?.avatar_url ?? null
  const listing = view.listing
  const currency = listing?.currency ?? 'AED'

  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({
      kind: 'message' as const,
      id: m.id,
      sender_id: m.sender_id,
      body: m.body,
      created_at: m.created_at,
    })),
    ...offers.map((o) => ({
      kind: 'offer' as const,
      id: o.id,
      sender_id: o.sender_id,
      amount_fils: o.amount_fils,
      status: o.status,
      created_at: o.created_at,
    })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const alreadyReviewed =
    order?.status === 'completed' ? !!(await getMyReview(order.id)) : false
  const otherRep = view.other ? await getSellerReputation(view.other.id, { withResponse: true }) : null

  return (
    <>
      <SiteHeader />
      <MarkConversationRead conversationId={conversationId} />
      <ConversationRealtime conversationId={conversationId} />
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
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold leading-tight">{otherName}</p>
                {otherRep && <SellerBadges badges={otherRep.badges} limit={2} className="hidden sm:flex" />}
              </div>
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

          <NegotiationChat
            conversationId={conversationId}
            items={timeline}
            meId={view.meId}
            buyerId={view.buyerId}
            otherName={otherName}
            otherAvatarUrl={otherAvatar}
            otherLastReadAt={view.otherLastReadAt}
            currency={currency}
            order={
              order
                ? {
                    id: order.id,
                    status: order.status,
                    acceptedPriceFils: order.accepted_price_fils,
                    buyerConfirmed: order.buyer_confirmed,
                    sellerConfirmed: order.seller_confirmed,
                    contactRevealed: order.contact_revealed,
                  }
                : null
            }
            alreadyReviewed={alreadyReviewed}
            disabled={view.status === 'blocked'}
          />
        </section>
      </div>
    </>
  )
}
