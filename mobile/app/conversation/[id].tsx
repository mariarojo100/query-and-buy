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
import { ErrorState } from '@/components/ui'

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
      <View className="mx-4 mb-2 rounded-2xl bg-primary-light p-3">
        <Text className="text-center text-sm font-semibold text-primary">✓ Transaction completed</Text>
      </View>
    )
  }

  // Confirmed stage: contacts + seller controls
  if (status === 'confirmed' && current) {
    return (
      <View className="mx-4 mb-2 rounded-2xl border border-primary/30 bg-primary-light p-3">
        <Text className="text-center text-sm font-semibold text-primary">
          Deal confirmed{current.accepted_price_fils != null ? ` · ${formatPrice(current.accepted_price_fils)}` : ''}
        </Text>
        <View className="mt-2 flex-row justify-center gap-2">
          <Pressable onPress={() => void reveal()} className="rounded-full bg-primary px-4 py-2">
            <Text className="text-xs font-semibold text-white">View contact</Text>
          </Pressable>
          {isSeller ? (
            <>
              <Pressable
                onPress={() => orderAction.mutate({ orderId: current.id, action: 'sold' }, { onError: err })}
                className="rounded-full bg-accent px-4 py-2"
              >
                <Text className="text-xs font-semibold text-white">Mark sold</Text>
              </Pressable>
              <Pressable
                onPress={() => orderAction.mutate({ orderId: current.id, action: 'reactivate' }, { onError: err })}
                className="rounded-full border border-border px-4 py-2 dark:border-border-dark"
              >
                <Text className="text-xs font-semibold text-ink dark:text-ink-dark">Relist</Text>
              </Pressable>
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
      <View className="mx-4 mb-2 rounded-2xl border border-border bg-card p-3 dark:border-border-dark dark:bg-card-dark">
        <Text className="text-center text-sm font-semibold text-ink dark:text-ink-dark">
          Offer accepted{current.accepted_price_fils != null ? ` · ${formatPrice(current.accepted_price_fils)}` : ''}
        </Text>
        <View className="mt-2 flex-row justify-center gap-2">
          {meConfirmed ? (
            <Text className="py-2 text-xs text-muted dark:text-muted-dark">Waiting for the other party to confirm…</Text>
          ) : (
            <Pressable
              onPress={() => {
                success()
                orderAction.mutate({ orderId: current.id, action: 'confirm' }, { onError: err })
              }}
              className="rounded-full bg-primary px-5 py-2"
            >
              <Text className="text-xs font-semibold text-white">Confirm deal</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => orderAction.mutate({ orderId: current.id, action: 'cancel' }, { onError: err })}
            className="rounded-full border border-border px-4 py-2 dark:border-border-dark"
          >
            <Text className="text-xs font-semibold text-danger">Cancel</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Pending offer aimed at me / sent by me
  if (pending && current) {
    const mine = pending.sender_id === meId
    return (
      <View className="mx-4 mb-2 rounded-2xl border border-border bg-card p-3 dark:border-border-dark dark:bg-card-dark">
        <Text className="text-center text-sm font-semibold text-ink dark:text-ink-dark">
          {mine ? 'Your offer' : 'Offer received'} · {formatPrice(pending.amount_fils)}
        </Text>
        {mine ? (
          <Text className="mt-1 text-center text-xs text-muted dark:text-muted-dark">Waiting for a response…</Text>
        ) : (
          <View className="mt-2 flex-row justify-center gap-2">
            <Pressable
              onPress={() => {
                success()
                respond.mutate({ offerId: pending.id, action: 'accept' }, { onError: err })
              }}
              className="rounded-full bg-primary px-5 py-2"
            >
              <Text className="text-xs font-semibold text-white">Accept</Text>
            </Pressable>
            <Pressable
              onPress={() => respond.mutate({ offerId: pending.id, action: 'decline' }, { onError: err })}
              className="rounded-full border border-border px-4 py-2 dark:border-border-dark"
            >
              <Text className="text-xs font-semibold text-danger">Decline</Text>
            </Pressable>
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
    <View className="mx-4 mb-2 rounded-2xl border border-border bg-card p-3 dark:border-border-dark dark:bg-card-dark">
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
    <View className="mt-2 flex-row items-center gap-2">
      <Pressable onPress={onSuggest} className="h-10 w-10 items-center justify-center rounded-full bg-primary-light">
        {suggesting ? <ActivityIndicator size="small" color="#0e5a43" /> : <Ionicons name="sparkles" size={16} color="#0e5a43" />}
      </Pressable>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="AED"
        placeholderTextColor="#a29d8f"
        keyboardType="numeric"
        className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm text-ink dark:border-border-dark dark:bg-background-dark dark:text-ink-dark"
      />
      <Pressable onPress={onSend} className="h-10 justify-center rounded-full bg-primary px-4">
        <Text className="text-xs font-semibold text-white">{label}</Text>
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
      <View className="flex-row items-center border-b border-border px-3 py-2 dark:border-border-dark">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#0e5a43" />
        </Pressable>
        <Pressable
          onPress={() => conv?.listing && router.push(`/listing/${conv.listing.id}`)}
          className="ml-1 flex-1 flex-row items-center"
        >
          <View className="h-9 w-9 overflow-hidden rounded-xl bg-border/40 dark:bg-border-dark/40">
            {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </View>
          <View className="ml-2 flex-1">
            <Text numberOfLines={1} className="text-sm font-semibold text-ink dark:text-ink-dark">
              {conv?.other?.display_name ?? '…'}
            </Text>
            <Text numberOfLines={1} className="text-xs text-muted dark:text-muted-dark">
              {conv?.listing ? `${conv.listing.title_en} · ${formatPrice(conv.listing.price_fils, conv.listing.currency)}` : ''}
            </Text>
          </View>
        </Pressable>
        <Pressable
          hitSlop={10}
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
          <Ionicons name="ellipsis-horizontal" size={20} color="#8a8578" />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1" keyboardVerticalOffset={8}>
        {/* Messages (inverted) */}
        <View className="flex-1">
          {q.isLoading ? (
            <ActivityIndicator className="mt-10" color="#0e5a43" />
          ) : (
            <FlashList
              data={messages}
              maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
              keyExtractor={(item: ConversationMessageDto) => item.id}
              renderItem={({ item }: { item: ConversationMessageDto }) => {
                const mine = item.sender_id === conv?.meId
                return (
                  <View className={`mx-4 my-1 max-w-[80%] rounded-2xl px-3.5 py-2.5 ${mine ? 'self-end rounded-br-md bg-primary' : 'self-start rounded-bl-md bg-card dark:bg-card-dark'}`}>
                    <Text className={`text-[15px] ${mine ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>{item.body}</Text>
                  </View>
                )
              }}
              contentContainerStyle={{ paddingVertical: 10 }}
            />
          )}
        </View>

        {/* Negotiation panel */}
        {q.data ? <OfferPanel data={q.data} conversationId={id} /> : null}

        {/* Composer */}
        <View className="flex-row items-center gap-2 border-t border-border px-4 py-2 dark:border-border-dark">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor="#a29d8f"
            multiline
            className="max-h-24 flex-1 rounded-3xl border border-border bg-card px-4 py-2.5 text-[15px] text-ink dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
          />
          <Pressable
            onPress={submit}
            disabled={!text.trim() || send.isPending}
            className={`h-10 w-10 items-center justify-center rounded-full bg-primary ${!text.trim() ? 'opacity-50' : ''}`}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
