/** Chats — the inbox: listing thumb, counterpart, last message, unread badge. */
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { formatPrice, type InboxItemDto } from '@qb/shared'
import { useInbox } from '@/queries/messaging'
import { useAuth } from '@/auth/AuthContext'
import { listingImageUrl } from '@/lib/images'
import { EmptyState, ErrorState } from '@/components/ui'

function chatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-AE', { hour: 'numeric', minute: '2-digit' })
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days < 7) return d.toLocaleDateString('en-AE', { weekday: 'short' })
  return d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })
}

export default function InboxScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const q = useInbox(!!user)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <Text className="px-5 pb-2 pt-3 text-2xl font-extrabold text-ink dark:text-ink-dark">Chats</Text>
      {!user ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center text-lg font-semibold text-ink dark:text-ink-dark">Message buyers & sellers</Text>
          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-5 rounded-full bg-primary px-8 py-3 active:opacity-90">
            <Text className="font-semibold text-white">Sign in</Text>
          </Pressable>
        </View>
      ) : q.isError ? (
        <ErrorState message="Couldn't load your chats." onRetry={() => void q.refetch()} />
      ) : (q.data?.conversations.length ?? 0) === 0 && !q.isLoading ? (
        <EmptyState title="No conversations yet" body="Message a seller from any listing to start one." />
      ) : (
        <FlashList
          data={q.data?.conversations ?? []}
          keyExtractor={(item: InboxItemDto) => item.id}
          renderItem={({ item }: { item: InboxItemDto }) => {
            const cover = listingImageUrl(item.listing?.cover_key ?? null)
            return (
              <Pressable
                onPress={() => router.push(`/conversation/${item.id}`)}
                className="mx-4 mb-2 flex-row items-center rounded-qb border border-border bg-card p-3 active:opacity-95 dark:border-border-dark dark:bg-card-dark"
              >
                <View className="h-14 w-14 overflow-hidden rounded-2xl bg-border/40 dark:bg-border-dark/40">
                  {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text numberOfLines={1} className="flex-1 font-semibold text-ink dark:text-ink-dark">
                      {item.other?.display_name ?? 'User'}
                    </Text>
                    <Text className="ml-2 text-xs text-muted dark:text-muted-dark">{chatTime(item.lastAt)}</Text>
                  </View>
                  <Text numberOfLines={1} className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                    {item.listing ? `${item.listing.title_en} · ${formatPrice(item.listing.price_fils, item.listing.currency)}` : ''}
                  </Text>
                  <View className="mt-0.5 flex-row items-center">
                    <Text numberOfLines={1} className="flex-1 text-sm text-ink/80 dark:text-ink-dark/80">
                      {item.lastBody ?? 'Say hello 👋'}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View className="ml-2 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
                        <Text className="text-[10px] font-bold text-white">{item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            )
          }}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
        />
      )}
    </SafeAreaView>
  )
}
