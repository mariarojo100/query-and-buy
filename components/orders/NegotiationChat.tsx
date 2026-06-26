'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCheckIcon,
  CheckIcon,
  HandshakeIcon,
  Loader2Icon,
  RotateCcwIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatChatTime, formatDateSeparator, formatPrice } from '@/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { initials } from '@/components/profile/ProfileHeader'
import { SellerCompletionActions } from '@/components/orders/SellerCompletionActions'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { sendMessage } from '@/app/messages/actions'
import {
  cancelOrder,
  confirmOrder,
  getRevealedContacts,
  makeOffer,
  respondToOffer,
  suggestOffer,
  type NegotiationSuggestion,
  type RevealedContact,
} from '@/app/orders/actions'
import type { OfferStatus, OrderStatus } from '@/lib/orders/queries'

export type TimelineItem =
  | { kind: 'message'; id: string; sender_id: string; body: string | null; created_at: string }
  | {
      kind: 'offer'
      id: string
      sender_id: string
      amount_fils: number
      status: OfferStatus
      created_at: string
    }

type OrderLite = {
  id: string
  status: OrderStatus
  acceptedPriceFils: number | null
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  contactRevealed: boolean
} | null

export function NegotiationChat({
  conversationId,
  items,
  meId,
  buyerId,
  otherName,
  otherAvatarUrl,
  otherLastReadAt,
  currency,
  order,
  alreadyReviewed = false,
  disabled = false,
}: {
  conversationId: string
  items: TimelineItem[]
  meId: string
  buyerId: string
  otherName: string
  otherAvatarUrl: string | null
  otherLastReadAt: string | null
  currency: string
  order: OrderLite
  alreadyReviewed?: boolean
  disabled?: boolean
}) {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const role: 'buyer' | 'seller' = meId === buyerId ? 'buyer' : 'seller'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [items.length, order?.status, order?.buyerConfirmed, order?.sellerConfirmed])

  // index of my last sent message → read receipt anchor
  let lastMineIdx = -1
  items.forEach((it, i) => {
    if (it.kind === 'message' && it.sender_id === meId) lastMineIdx = i
  })
  const seen =
    lastMineIdx >= 0 &&
    otherLastReadAt != null &&
    new Date(otherLastReadAt) >= new Date(items[lastMineIdx].created_at)

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No messages yet. Say hello 👋 or make an offer below.
          </p>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {items.map((it, i) => {
              const prev = items[i - 1]
              const showDate =
                !prev || new Date(prev.created_at).toDateString() !== new Date(it.created_at).toDateString()
              const mine = it.sender_id === meId

              return (
                <div key={`${it.kind}-${it.id}`} className="flex flex-col gap-3">
                  {showDate && (
                    <div className="my-1 flex justify-center">
                      <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        {formatDateSeparator(it.created_at)}
                      </span>
                    </div>
                  )}

                  {it.kind === 'offer' ? (
                    <OfferBubble
                      offer={it}
                      mine={mine}
                      senderIsBuyer={it.sender_id === buyerId}
                      otherName={otherName}
                      currency={currency}
                      orderClosed={
                        !order ||
                        ['confirmed', 'cancelled', 'completed'].includes(order.status)
                      }
                    />
                  ) : (
                    <MessageBubble
                      mine={mine}
                      body={it.body}
                      created_at={it.created_at}
                      otherName={otherName}
                      otherAvatarUrl={otherAvatarUrl}
                      showAvatar={
                        !mine && items[i + 1]?.sender_id !== it.sender_id
                      }
                    />
                  )}

                  {i === lastMineIdx && (
                    <span className="-mt-1 flex items-center justify-end gap-1 px-1 text-[11px] text-muted-foreground">
                      {seen ? (
                        <>
                          <CheckCheckIcon className="size-3 text-primary" /> Seen
                        </>
                      ) : (
                        <>
                          <CheckIcon className="size-3" /> Sent
                        </>
                      )}
                    </span>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <NegotiationDock
        conversationId={conversationId}
        order={order}
        role={role}
        otherName={otherName}
        currency={currency}
        alreadyReviewed={alreadyReviewed}
        disabled={disabled}
        onChanged={() => router.refresh()}
      />
    </>
  )
}

/* ---------------- message bubble ---------------- */
function MessageBubble({
  mine,
  body,
  created_at,
  otherName,
  otherAvatarUrl,
  showAvatar,
}: {
  mine: boolean
  body: string | null
  created_at: string
  otherName: string
  otherAvatarUrl: string | null
  showAvatar: boolean
}) {
  return (
    <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
      {!mine &&
        (showAvatar ? (
          <Avatar className="size-7">
            <AvatarImage src={otherAvatarUrl ?? undefined} alt={otherName} />
            <AvatarFallback className="text-[10px]">{initials(otherName)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="w-7 shrink-0" />
        ))}
      <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed shadow-sm',
            mine
              ? 'rounded-2xl rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-2xl rounded-bl-md border border-border bg-card',
          )}
        >
          {body}
        </div>
        <span className="mt-1 px-1 text-[11px] text-muted-foreground">
          {formatChatTime(created_at)}
        </span>
      </div>
    </div>
  )
}

/* ---------------- offer card (inline in history) ---------------- */
function OfferBubble({
  offer,
  mine,
  senderIsBuyer,
  otherName,
  currency,
  orderClosed,
}: {
  offer: Extract<TimelineItem, { kind: 'offer' }>
  mine: boolean
  senderIsBuyer: boolean
  otherName: string
  currency: string
  orderClosed: boolean
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const verb = senderIsBuyer ? 'offered' : 'countered'
  const who = mine ? 'You' : otherName
  const canRespond = !mine && offer.status === 'pending' && !orderClosed

  function respond(action: 'accept' | 'decline') {
    start(async () => {
      const res = await respondToOffer(offer.id, action)
      if (res.error) toast.error(res.error)
      else {
        toast.success(action === 'accept' ? 'Offer accepted' : 'Offer declined')
        router.refresh()
      }
    })
  }

  const tone =
    offer.status === 'accepted'
      ? 'border-primary/40 bg-primary/5'
      : offer.status === 'declined'
        ? 'border-border bg-muted/40'
        : offer.status === 'pending'
          ? 'border-gold/40 bg-accent/40'
          : 'border-border bg-muted/30'

  return (
    <div className={cn('mx-auto w-full max-w-sm rounded-2xl border p-4 shadow-sm', tone)}>
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TagIcon className="size-4" />
        </span>
        <p className="text-xs text-muted-foreground">
          {who} {verb}
        </p>
        <OfferStatusBadge status={offer.status} />
      </div>
      <p className="font-display mt-2 text-2xl tracking-tight tnum">
        {formatPrice(offer.amount_fils, currency)}
      </p>

      {canRespond && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" className="rounded-full" disabled={pending} onClick={() => respond('accept')}>
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent('qb:counter', { detail: { amountAed: Math.round(offer.amount_fils / 100) } }),
              )
            }
          >
            Counter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground"
            disabled={pending}
            onClick={() => respond('decline')}
          >
            Decline
          </Button>
        </div>
      )}
    </div>
  )
}

function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const map: Record<OfferStatus, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-gold/15 text-foreground border-gold/40' },
    accepted: { label: 'Accepted', cls: 'bg-primary/10 text-primary border-primary/30' },
    declined: { label: 'Declined', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
    countered: { label: 'Updated', cls: 'bg-muted text-muted-foreground border-border' },
    superseded: { label: 'Updated', cls: 'bg-muted text-muted-foreground border-border' },
  }
  const s = map[status]
  return (
    <span className={cn('ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium', s.cls)}>
      {status === 'accepted' && '✓ '}
      {s.label}
    </span>
  )
}

/* ---------------- dock: offer input · AI suggest · confirm · reveal · composer ---------------- */
function NegotiationDock({
  conversationId,
  order,
  role,
  otherName,
  currency,
  alreadyReviewed,
  disabled,
  onChanged,
}: {
  conversationId: string
  order: OrderLite
  role: 'buyer' | 'seller'
  otherName: string
  currency: string
  alreadyReviewed: boolean
  disabled: boolean
  onChanged: () => void
}) {
  const [text, setText] = useState('')
  const [offerOpen, setOfferOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [suggestion, setSuggestion] = useState<NegotiationSuggestion | null>(null)
  const [pending, start] = useTransition()
  const [suggesting, startSuggest] = useTransition()

  // Counter button (from an offer card) opens the offer input prefilled.
  useEffect(() => {
    function onCounter(e: Event) {
      const detail = (e as CustomEvent).detail as { amountAed?: number }
      setOfferOpen(true)
      if (detail?.amountAed) setAmount(String(detail.amountAed))
    }
    document.addEventListener('qb:counter', onCounter)
    return () => document.removeEventListener('qb:counter', onCounter)
  }, [])

  if (disabled) {
    return (
      <div className="border-t border-border p-3 text-center text-sm text-muted-foreground">
        This conversation is closed.
      </div>
    )
  }

  const accepted =
    order && (order.status === 'offer_accepted' || order.status === 'awaiting_confirmation')
  const reserved = order?.status === 'confirmed'
  const completed = order?.status === 'completed'
  const cancelledDeal = order?.status === 'cancelled' && order?.acceptedPriceFils != null
  const dealOver = completed || order?.status === 'cancelled'
  const showReveal = (reserved || completed) && !!order?.contactRevealed
  const negotiating = !reserved && !dealOver

  function sendText() {
    const body = text.trim()
    if (!body || pending) return
    start(async () => {
      const res = await sendMessage(conversationId, body)
      if (res.error) toast.error(res.error, res.blocked ? { duration: 6000 } : undefined)
      else {
        setText('')
        onChanged()
      }
    })
  }

  function submitOffer() {
    const val = amount.trim()
    if (!val || pending) return
    start(async () => {
      const res = await makeOffer(conversationId, val)
      if (res.error) toast.error(res.error)
      else {
        setAmount('')
        setOfferOpen(false)
        setSuggestion(null)
        toast.success('Offer sent')
        onChanged()
      }
    })
  }

  function getSuggestion() {
    startSuggest(async () => {
      const res = await suggestOffer(conversationId)
      if (res.error || !res.suggestion) toast.error(res.error ?? 'Could not get a suggestion.')
      else setSuggestion(res.suggestion)
    })
  }

  return (
    <div
      className="border-t border-border bg-background/85 backdrop-blur"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.25rem)' }}
    >
      {/* contact reveal — shown while reserved and after sold */}
      {showReveal && order && (
        <ContactRevealPanel
          orderId={order.id}
          currency={currency}
          acceptedFils={order.acceptedPriceFils}
          completed={!!completed}
        />
      )}

      {/* reserved: seller completes the transaction; buyer waits */}
      {reserved && order && (
        <div className="mx-3 mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {role === 'seller' ? (
            <>
              <p className="text-sm font-semibold">Complete the transaction</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Once you&apos;ve met the buyer and handed over the item, mark it sold — or re-activate
                to put it back on the market.
              </p>
              <div className="mt-3">
                <SellerCompletionActions orderId={order.id} onChanged={onChanged} />
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin text-primary" />
              Waiting for the seller to complete the transaction.
            </p>
          )}
        </div>
      )}

      {/* completed / cancelled-after-deal banners */}
      {completed && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 p-4">
          <CheckCheckIcon className="size-4 text-success" />
          <p className="text-sm font-semibold text-success">Transaction completed</p>
        </div>
      )}
      {completed &&
        order &&
        (alreadyReviewed ? (
          <div className="mx-3 mt-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            ✓ You rated this transaction. Thank you!
          </div>
        ) : (
          <div className="mx-3 mt-3">
            <ReviewForm orderId={order.id} revieweeName={otherName} onDone={onChanged} />
          </div>
        ))}
      {cancelledDeal && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
          <RotateCcwIcon className="size-4 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {role === 'seller'
              ? 'You re-activated this listing — it’s back in search.'
              : 'Reservation cancelled by the seller — the item is available again.'}
          </p>
        </div>
      )}

      {accepted && order && (
        <ConfirmPanel
          order={order}
          role={role}
          otherName={otherName}
          currency={currency}
          pending={pending}
          onConfirm={() =>
            start(async () => {
              const res = await confirmOrder(order.id)
              if (res.error) toast.error(res.error)
              else {
                toast.success('Confirmed')
                onChanged()
              }
            })
          }
          onCancel={() =>
            start(async () => {
              const res = await cancelOrder(order.id)
              if (res.error) toast.error(res.error)
              else onChanged()
            })
          }
        />
      )}

      {/* AI suggestion card */}
      {suggestion && negotiating && (
        <div className="mx-3 mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <p className="text-sm font-semibold">
              Suggested {suggestion.role === 'buyer' ? 'offer' : 'counter'}
            </p>
            <button
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => setSuggestion(null)}
              aria-label="Dismiss"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <p className="font-display mt-1 text-2xl tracking-tight tnum">
            {formatPrice(suggestion.suggestedAed * 100, currency)}
          </p>
          {suggestion.marketAvgAed != null && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              UAE market avg ≈ {formatPrice(suggestion.marketAvgAed * 100, currency)}
            </p>
          )}
          {suggestion.reasons.length > 0 && (
            <ul className="mt-2 space-y-1">
              {suggestion.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CheckIcon className="mt-0.5 size-3 shrink-0 text-primary" />
                  {r}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => {
                setAmount(String(suggestion.suggestedAed))
                setOfferOpen(true)
                setSuggestion(null)
              }}
            >
              Use this amount
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">AI guidance only — nothing is sent automatically.</p>
        </div>
      )}

      {/* offer input row */}
      {offerOpen && negotiating && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 pl-4">
          <span className="text-sm font-medium text-muted-foreground">{currency}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitOffer()}
            placeholder="Amount"
            className="h-9 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
          <Button size="sm" className="rounded-full" disabled={pending || !amount.trim()} onClick={submitOffer}>
            Send offer
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 rounded-full"
            onClick={() => setOfferOpen(false)}
            aria-label="Cancel offer"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}

      {/* action buttons */}
      {negotiating && (
        <div className="flex items-center gap-2 px-3 pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setOfferOpen((v) => !v)}
          >
            <HandshakeIcon className="size-4" /> Make an offer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full text-primary hover:text-primary"
            disabled={suggesting}
            onClick={getSuggestion}
          >
            {suggesting ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
            AI Suggest
          </Button>
        </div>
      )}

      {/* text composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendText()
        }}
        className="flex items-end gap-2 p-3"
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendText()
            }
          }}
          rows={1}
          placeholder="Write a message…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-card px-4 py-2.5"
          aria-label="Message"
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending || !text.trim()}
          aria-label="Send"
          className="size-11 shrink-0 rounded-full bg-gradient-to-br from-primary to-emerald-800 shadow-sm transition hover:opacity-95"
        >
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  )
}

/* ---------------- confirm panel ---------------- */
function ConfirmPanel({
  order,
  role,
  otherName,
  currency,
  pending,
  onConfirm,
  onCancel,
}: {
  order: NonNullable<OrderLite>
  role: 'buyer' | 'seller'
  otherName: string
  currency: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const myConfirmed = role === 'buyer' ? order.buyerConfirmed : order.sellerConfirmed
  const otherConfirmed = role === 'buyer' ? order.sellerConfirmed : order.buyerConfirmed

  return (
    <div className="mx-3 mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <HandshakeIcon className="size-4 text-primary" />
        <p className="text-sm font-semibold">Offer accepted</p>
      </div>
      {order.acceptedPriceFils != null && (
        <p className="font-display mt-1 text-2xl tracking-tight tnum">
          {formatPrice(order.acceptedPriceFils, currency)}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Both of you confirm to unlock contact details and reserve the item.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {myConfirmed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <CheckIcon className="size-3.5" /> You confirmed
            {!otherConfirmed && ` — waiting for ${otherName}`}
          </span>
        ) : (
          <Button size="sm" className="rounded-full" disabled={pending} onClick={onConfirm}>
            {role === 'buyer' ? 'Confirm Purchase' : 'Confirm Sale'}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full text-muted-foreground"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

/* ---------------- contact reveal ---------------- */
function ContactRevealPanel({
  orderId,
  currency,
  acceptedFils,
  completed = false,
}: {
  orderId: string
  currency: string
  acceptedFils: number | null
  completed?: boolean
}) {
  const [data, setData] = useState<{ buyer?: RevealedContact; seller?: RevealedContact } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getRevealedContacts(orderId).then((res) => {
      if (!active) return
      if (res.error) setError(res.error)
      else setData({ buyer: res.buyer, seller: res.seller })
    })
    return () => {
      active = false
    }
  }, [orderId])

  return (
    <div className="mx-3 mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="size-4 text-primary" />
        <p className="text-sm font-semibold">
          {completed ? 'Transaction complete — contact details' : 'Deal confirmed — contact unlocked'}
        </p>
        {acceptedFils != null && (
          <span className="ml-auto rounded-full border border-primary/30 bg-card px-2 py-0.5 text-xs font-semibold tnum">
            {formatPrice(acceptedFils, currency)}
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : !data ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" /> Loading contact details…
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ContactCard label="Seller" c={data.seller} />
          <ContactCard label="Buyer" c={data.buyer} />
        </div>
      )}

      <div className="mt-3 space-y-1 border-t border-primary/20 pt-3 text-[11px] text-muted-foreground">
        <p>📍 Meet in a safe, public place to inspect the item and pay.</p>
        <p>🛡️ Never pay in advance. Query &amp; Buy does not process payments.</p>
      </div>
    </div>
  )
}

function ContactCard({ label, c }: { label: string; c?: RevealedContact }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-medium">{c?.name ?? '—'}</p>
      {c?.phone ? (
        <a href={`tel:${c.phone}`} className="mt-1 block text-sm text-primary hover:underline">
          {c.phone}
        </a>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No phone on file</p>
      )}
      {c?.email ? (
        <a href={`mailto:${c.email}`} className="block truncate text-sm text-primary hover:underline">
          {c.email}
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">No email on file</p>
      )}
    </div>
  )
}
