/**
 * Conversation — chat thread (5s focus-gated poll) + the negotiation panel:
 * make/accept/decline offers, AI offer advisor, both-party confirmation,
 * contact reveal, and the seller's sold/reactivate controls.
 */
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { formatPrice, type ConversationMessageDto } from '@qb/shared'
import {
  useThread,
  useSendMessage,
  useMakeOffer,
  useRespondToOffer,
  useOrderAction,
  fetchContacts,
  fetchOfferSuggestion,
  markThreadRead,
  type ThreadResponse,
} from '@/queries/messaging'
import { ApiError } from '@/api/client'
import { listingImageUrl } from '@/lib/images'
import { reportContent, blockUser } from '@/lib/moderation'
import { success, tick } from '@/lib/haptics'
import { COLORS } from '@/theme/colors'
import { EmptyState, ErrorState, ScalePressable } from '@/components/ui'

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}
function fmtDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function DaySeparator({ label }: { label: string }) {
  return (
    <View className="my-3 flex-row items-center justify-center">
      <View className="rounded-full bg-border/70 px-3 py-1 dark:bg-card-dark">
        <Text className="text-[11px] font-semibold text-muted dark:text-muted-dark">{label}</Text>
      </View>
    </View>
  )
}

function OfferPanel({ data, conversationId }: { data: ThreadResponse; conversationId: string }) {
  const { conversation, order } = data
  const meId = conversation.meId
  const isSeller = meId === conversation.sellerId
  const current = order.order
  const pending = order.offers.find((o) => o.status === 'pending')

  const makeOffer = useMakeOffer(conversationId)
  const respond = useRespondToOffer(conversationId)
  const orderAction = useOrderAction(conversationId)

  const [amount, setAmount] = useState('')
  const [suggesting, setSuggesting] = useState(false)

  const err = (e: unknown) =>
    Alert.alert('Not possible', e instanceof ApiError ? e.message : 'Try again.')

  const suggest = async () => {
    setSuggesting(true)
    try {
      const { suggestion } = await fetchOfferSuggestion(conversationId)
      setAmount(String(suggestion.suggestedAed))
      Alert.alert(
        `AI suggests AED ${suggestion.suggestedAed.toLocaleString()}`,
        suggestion.reasons.join('\n• '),
      )
    } catch (e) {
      err(e)
    } finally {
      setSuggesting(false)
    }
  }

  const reveal = async () => {
    if (!current) return
    try {
      const c = await fetchContacts(current.id)
      const other = isSeller ? c.buyer : c.seller
      Alert.alert(
        `${other.display_name}'s contact`,
        [other.phone, other.email].filter(Boolean).join('\n') || 'No contact details on file.',
      )
    } catch (e) {
      err(e)
    }
  }

  const status = current?.status

  // Completed / cancelled banners
  if (status === 'completed') {
    return (
      <View className="mx-4 mb-2 flex-row items-center justify-center rounded-card bg-success/10 px-4 py-3">
        <Ionicons name="checkmark-circle" size={17} color={COLORS.success} />
        <Text className="ml-1.5 text-[13.5px] font-bold text-success">Transaction completed</Text>
      </View>
    )
  }

  // Confirmed stage: contacts + seller controls
  if (status === 'confirmed' && current) {
    return (
      <View className="mx-4 mb-2 rounded-card border border-primary/25 bg-primary-tint p-3.5 dark:border-primary/30 dark:bg-primary/10">
        <OfferHeader
          overline="Deal confirmed"
          tone="success"
          amount={current.accepted_price_fils}
          icon="shield-checkmark"
        />
        <View className="mt-3 flex-row gap-2">
          <OfferAction label="View contact" tone="primary" onPress={() => void reveal()} />
          {isSeller ? (
            <>
              <OfferAction label="Mark sold" tone="accent" onPress={() => orderAction.mutate({ orderId: current.id, action: 'sold' }, { onError: err })} />
              <OfferAction label="Relist" tone="outline" onPress={() => orderAction.mutate({ orderId: current.id, action: 'reactivate' }, { onError: err })} />
            </>
          ) : null}
        </View>
      </View>
    )
  }

  // Accepted → both-party confirmation
  if ((status === 'offer_accepted' || status === 'awaiting_confirmation') && current) {
    const meConfirmed = isSeller ? current.seller_confirmed : current.buyer_confirmed
    return (
      <View className="mx-4 mb-2 rounded-card border border-border bg-card p-3.5 dark:border-border-dark dark:bg-card-dark">
        <OfferHeader overline="Offer accepted" tone="ink" amount={current.accepted_price_fils} icon="hand-left" />
        {meConfirmed ? (
          <Text className="mt-2.5 text-center text-[12.5px] text-muted dark:text-muted-dark">Waiting for the other party to confirm…</Text>
        ) : (
          <View className="mt-3 flex-row gap-2">
            <OfferAction
              label="Confirm deal"
              tone="primary"
              onPress={() => {
                success()
                orderAction.mutate({ orderId: current.id, action: 'confirm' }, { onError: err })
              }}
            />
            <OfferAction label="Cancel" tone="ghostDanger" onPress={() => orderAction.mutate({ orderId: current.id, action: 'cancel' }, { onError: err })} />
          </View>
        )}
      </View>
    )
  }

  // Pending offer aimed at me / sent by me
  if (pending && current) {
    const mine = pending.sender_id === meId
    return (
      <View className="mx-4 mb-2 rounded-card border border-border bg-card p-3.5 dark:border-border-dark dark:bg-card-dark">
        <OfferHeader overline={mine ? 'Your offer' : 'Offer received'} tone="ink" amount={pending.amount_fils} icon="pricetag" />
        {mine ? (
          <Text className="mt-2 text-center text-[12.5px] text-muted dark:text-muted-dark">Waiting for a response…</Text>
        ) : (
          <View className="mt-3 flex-row gap-2">
            <OfferAction
              label="Accept"
              tone="primary"
              onPress={() => {
                success()
                respond.mutate({ offerId: pending.id, action: 'accept' }, { onError: err })
              }}
            />
            <OfferAction label="Decline" tone="ghostDanger" onPress={() => respond.mutate({ offerId: pending.id, action: 'decline' }, { onError: err })} />
          </View>
        )}
        {!mine ? (
          <OfferComposer amount={amount} setAmount={setAmount} suggesting={suggesting} onSuggest={suggest} onSend={() => {
            const aed = Number(amount)
            if (aed > 0) makeOffer.mutate(aed, { onError: err, onSuccess: () => setAmount('') })
          }} label="Counter" />
        ) : null}
      </View>
    )
  }

  // Default: offer composer
  return (
    <View className="mx-4 mb-2 rounded-card border border-border bg-card p-3.5 dark:border-border-dark dark:bg-card-dark">
      <View className="flex-row items-center">
        <Ionicons name="pricetag-outline" size={15} color={COLORS.muted} />
        <Text className="ml-1.5 text-[12.5px] font-semibold text-ink-soft dark:text-ink-soft-dark">Make an offer</Text>
      </View>
      <OfferComposer
        amount={amount}
        setAmount={setAmount}
        suggesting={suggesting}
        onSuggest={suggest}
        onSend={() => {
          const aed = Number(amount)
          if (aed > 0) makeOffer.mutate(aed, { onError: err, onSuccess: () => setAmount('') })
        }}
        label="Make offer"
      />
    </View>
  )
}

/** Offer-card header: status overline + prominent amount + tone icon. */
function OfferHeader({
  overline,
  amount,
  tone,
  icon,
}: {
  overline: string
  amount: number | null | undefined
  tone: 'success' | 'ink'
  icon: keyof typeof Ionicons.glyphMap
}) {
  const c = tone === 'success' ? COLORS.primary : COLORS.ink
  return (
    <View className="flex-row items-center">
      <View className={`mr-2.5 h-9 w-9 items-center justify-center rounded-full ${tone === 'success' ? 'bg-primary/15' : 'bg-sunken dark:bg-sunken-dark'}`}>
        <Ionicons name={icon} size={17} color={c} />
      </View>
      <View className="flex-1">
        <Text className="text-[10.5px] font-bold uppercase tracking-wide text-muted dark:text-muted-dark">{overline}</Text>
        {amount != null ? (
          <Text className="text-[19px] font-extrabold tracking-tight text-ink dark:text-ink-dark">{formatPrice(amount)}</Text>
        ) : null}
      </View>
    </View>
  )
}

/** Offer-card action button. Equal-width in a row; tones map to the DS. */
function OfferAction({ label, tone, onPress }: { label: string; tone: 'primary' | 'accent' | 'outline' | 'ghostDanger'; onPress: () => void }) {
  const surface =
    tone === 'primary'
      ? 'bg-primary'
      : tone === 'accent'
        ? 'bg-accent'
        : 'border border-border-strong dark:border-border-strong-dark'
  const labelCls = tone === 'primary' || tone === 'accent' ? 'text-white' : tone === 'ghostDanger' ? 'text-danger' : 'text-ink dark:text-ink-dark'
  return (
    <Pressable onPress={onPress} className={`h-11 flex-1 items-center justify-center rounded-xl active:opacity-90 ${surface}`}>
      <Text className={`text-[13px] font-bold ${labelCls}`}>{label}</Text>
    </Pressable>
  )
}

function OfferComposer({
  amount,
  setAmount,
  suggesting,
  onSuggest,
  onSend,
  label,
}: {
  amount: string
  setAmount: (v: string) => void
  suggesting: boolean
  onSuggest: () => void
  onSend: () => void
  label: string
}) {
  return (
    <View className="mt-2.5 flex-row items-center gap-2">
      <Pressable onPress={onSuggest} className="h-11 w-11 items-center justify-center rounded-xl bg-primary-light dark:bg-primary/15" accessibilityLabel="Suggest an offer with AI">
        {suggesting ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="sparkles" size={17} color={COLORS.primary} />}
      </Pressable>
      <View className="h-11 flex-1 flex-row items-center rounded-xl border border-border bg-sunken px-3.5 dark:border-border-dark dark:bg-sunken-dark">
        <Text className="text-[13px] font-bold text-muted dark:text-muted-dark">AED</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={COLORS.muted}
          keyboardType="numeric"
          className="ml-1.5 flex-1 text-[15px] font-semibold text-ink dark:text-ink-dark"
        />
      </View>
      <Pressable onPress={onSend} className="h-11 justify-center rounded-xl bg-primary px-4 active:opacity-90">
        <Text className="text-[13px] font-bold text-white">{label}</Text>
      </Pressable>
    </View>
  )
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const q = useThread(id)
  const send = useSendMessage(id)
  const [text, setText] = useState('')

  useEffect(() => {
    if (q.data) void markThreadRead(id).catch(() => {})
  }, [id, q.data])

  const messages = useMemo(() => q.data?.messages ?? [], [q.data?.messages])

  if (q.isError) return <ErrorState message="Conversation unavailable." onRetry={() => void q.refetch()} />

  const conv = q.data?.conversation
  const cover = listingImageUrl(conv?.listing?.cover_key ?? null)

  const submit = () => {
    const body = text.trim()
    if (!body) return
    tick()
    setText('')
    send.mutate(body, {
      onError: (e) => {
        setText(body)
        Alert.alert('Not sent', e instanceof ApiError ? e.message : 'Try again.')
      },
    })
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center border-b border-border px-2 py-2 dark:border-border-dark">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-10 w-10 items-center justify-center" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
        </Pressable>
        <Pressable
          onPress={() => conv?.listing && router.push(`/listing/${conv.listing.id}`)}
          className="flex-1 flex-row items-center"
        >
          <View className="h-10 w-10 overflow-hidden rounded-xl bg-primary-light dark:bg-card-dark">
            {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </View>
          <View className="ml-2.5 flex-1">
            <Text numberOfLines={1} className="text-[15px] font-bold text-ink dark:text-ink-dark">
              {conv?.other?.display_name ?? '…'}
            </Text>
            <Text numberOfLines={1} className="text-[12px] text-muted dark:text-muted-dark">
              {conv?.listing ? `${conv.listing.title_en} · ${formatPrice(conv.listing.price_fils, conv.listing.currency)}` : ''}
            </Text>
          </View>
        </Pressable>
        <Pressable
          hitSlop={10}
          className="h-10 w-10 items-center justify-center"
          accessibilityLabel="More options"
          onPress={() => {
            if (!conv?.other) return
            const other = conv.other
            Alert.alert(other.display_name, undefined, [
              { text: 'Report user', onPress: () => reportContent({ reportedUserId: other.id }) },
              {
                text: 'Block user',
                style: 'destructive',
                onPress: () => blockUser(other.id, other.display_name, () => router.back()),
              },
              { text: 'Cancel', style: 'cancel' },
            ])
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.muted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1" keyboardVerticalOffset={8}>
        {/* Listing context banner */}
        {conv?.listing ? (
          <Pressable
            onPress={() => router.push(`/listing/${conv.listing!.id}`)}
            className="mx-4 mt-3 flex-row items-center rounded-2xl border border-border bg-card p-2.5 active:opacity-95 dark:border-border-dark dark:bg-card-dark"
          >
            <View className="h-11 w-11 overflow-hidden rounded-xl bg-primary-light dark:bg-background-dark">
              {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
            </View>
            <View className="ml-2.5 flex-1">
              <Text numberOfLines={1} className="text-[13px] font-semibold text-ink dark:text-ink-dark">{conv.listing.title_en}</Text>
              <Text className="text-[13px] font-bold text-primary dark:text-primary-light">
                {formatPrice(conv.listing.price_fils, conv.listing.currency)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </Pressable>
        ) : null}

        {/* Messages */}
        <View className="flex-1">
          {q.isLoading ? (
            <ActivityIndicator className="mt-10" color={COLORS.primary} />
          ) : messages.length === 0 ? (
            <EmptyState icon="chatbubble-ellipses-outline" title="Say hello 👋" body="Send a message to start the conversation." />
          ) : (
            <FlashList
              data={messages}
              maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
              keyExtractor={(item: ConversationMessageDto) => item.id}
              renderItem={({ item, index }: { item: ConversationMessageDto; index: number }) => {
                const mine = item.sender_id === conv?.meId
                const prev = messages[index - 1]
                const showDay = !prev || !sameDay(prev.created_at, item.created_at)
                return (
                  <View>
                    {showDay ? <DaySeparator label={fmtDay(item.created_at)} /> : null}
                    <View className={`mx-4 my-0.5 max-w-[80%] px-3.5 py-2.5 ${mine
                      ? 'self-end rounded-2xl rounded-br-md bg-primary'
                      : 'self-start rounded-2xl rounded-bl-md border border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
                    >
                      <Text className={`text-[15px] leading-[20px] ${mine ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>
                        {item.body ?? ''}
                      </Text>
                      <Text className={`mt-1 self-end text-[10px] ${mine ? 'text-white/65' : 'text-muted dark:text-muted-dark'}`}>
                        {fmtTime(item.created_at)}
                      </Text>
                    </View>
                  </View>
                )
              }}
              contentContainerStyle={{ paddingVertical: 12 }}
            />
          )}
        </View>

        {/* Negotiation panel */}
        {q.data ? <OfferPanel data={q.data} conversationId={id} /> : null}

        {/* Composer */}
        <View className="flex-row items-end gap-2 border-t border-border px-4 py-2.5 dark:border-border-dark">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={COLORS.muted}
            multiline
            className="max-h-28 min-h-[44px] flex-1 rounded-3xl border border-border bg-card px-4 py-3 text-[15px] text-ink dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
          />
          <ScalePressable
            onPress={submit}
            disabled={!text.trim() || send.isPending}
            accessibilityLabel="Send message"
            className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${!text.trim() ? 'opacity-40' : ''}`}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </ScalePressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
