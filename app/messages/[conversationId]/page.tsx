import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeftIcon, ImageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { MessageThread } from '@/components/messaging/MessageThread'
import { MessageComposer } from '@/components/messaging/MessageComposer'
import { MarkConversationRead } from '@/components/messaging/MarkConversationRead'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { getConversationView, getConversationMessages } from '@/lib/messaging/queries'

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

  // Null when the user is not a participant (RLS) → 404.
  const view = await getConversationView(conversationId)
  if (!view) notFound()

  const messages = await getConversationMessages(conversationId)
  const otherName = view.other?.display_name ?? 'Unknown user'
  const listing = view.listing

  return (
    <>
      <SiteHeader />
      <MarkConversationRead conversationId={conversationId} />
      <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col">
        {/* Listing summary header */}
        <div className="flex items-center gap-3 border-b p-3">
          <Link
            href="/messages"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Back to messages"
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          {listing ? (
            <Link href={`/listing/${listing.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-muted">
                {listing.cover_key ? (
                  <Image
                    src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
                    alt={listing.title_en}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-4 opacity-40" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{listing.title_en}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(listing.price_fils, listing.currency)} · {otherName}
                </p>
              </div>
            </Link>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Listing no longer available</p>
              <p className="text-xs text-muted-foreground">{otherName}</p>
            </div>
          )}
        </div>

        <MessageThread messages={messages} meId={view.meId} otherName={otherName} />
        <MessageComposer conversationId={conversationId} disabled={view.status === 'blocked'} />
      </div>
    </>
  )
}
