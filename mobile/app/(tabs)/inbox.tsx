/** Inbox — conversation list: listing thumb + seller avatar, last message,
 *  time, unread emphasis. Clean full-width rows with inset separators. */
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { formatPrice, type InboxItemDto } from '@qb/shared'
import { useInbox } from '@/queries/messaging'
import { useAuth } from '@/auth/AuthContext'
import { listingImageUrl } from '@/lib/images'
import { COLORS } from '@/theme/colors'
import { ErrorState, Skeleton } from '@/components/ui'

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

function Row({ item, onPress }: { item: InboxItemDto; onPress: () => void }) {
  const cover = listingImageUrl(item.listing?.cover_key ?? null)
  const unread = item.unreadCount > 0
  const name = item.other?.display_name ?? 'User'
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-5 py-3 active:bg-primary-light/40 dark:active:bg-card-dark">
      {/* listing thumb + overlapping seller avatar */}
      <View className="h-14 w-14">
        <View className="h-14 w-14 overflow-hidden rounded-2xl bg-primary-light dark:bg-card-dark">
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="image-outline" size={18} color={COLORS.primary + '55'} />
            </View>
          )}
        </View>
        <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-primary-light dark:border-background-dark">
          {item.other?.avatar_url ? (
            <Image source={{ uri: item.other.avatar_url }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text className="text-[10px] font-bold text-primary">{name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
      </View>

      <View className="ml-3.5 flex-1">
        <View className="flex-row items-center">
          <Text numberOfLines={1} className={`flex-1 text-[15px] text-ink dark:text-ink-dark ${unread ? 'font-extrabold' : 'font-semibold'}`}>
            {name}
          </Text>
          <Text className={`ml-2 text-[11px] ${unread ? 'font-bold text-primary dark:text-primary-light' : 'text-muted dark:text-muted-dark'}`}>
            {chatTime(item.lastAt)}
          </Text>
        </View>
        {item.listing ? (
          <Text numberOfLines={1} className="mt-0.5 text-[11.5px] text-muted dark:text-muted-dark">
            {item.listing.title_en} · {formatPrice(item.listing.price_fils, item.listing.currency)}
          </Text>
        ) : null}
        <View className="mt-1 flex-row items-center">
          <Text numberOfLines={1} className={`flex-1 text-[13px] ${unread ? 'font-semibold text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark'}`}>
            {item.lastBody ?? 'Say hello 👋'}
          </Text>
          {unread ? (
            <View className="ml-2 h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5">
              <Text className="text-[10px] font-bold text-white">{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

export default function InboxScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const q = useInbox(!!user)
  const items = q.data?.conversations ?? []

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="px-5 pb-2 pt-3">
        <Text className="text-[26px] font-extrabold tracking-tight text-ink dark:text-ink-dark">Inbox</Text>
      </View>

      {!user ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-light">
            <Ionicons name="chatbubbles-outline" size={30} color={COLORS.primary} />
          </View>
          <Text className="mt-4 text-center text-[17px] font-bold text-ink dark:text-ink-dark">Message buyers & sellers</Text>
          <Text className="mt-1.5 text-center text-[13px] text-muted dark:text-muted-dark">
            Sign in to chat, make offers, and track your deals.
          </Text>
          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-5 rounded-full bg-primary px-9 py-3.5 active:opacity-90">
            <Text className="text-[15px] font-bold text-white">Sign in</Text>
          </Pressable>
        </View>
      ) : q.isError ? (
        <ErrorState message="Couldn't load your chats." onRetry={() => void q.refetch()} />
      ) : q.isLoading ? (
        <View className="px-5 pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="mb-4 flex-row items-center">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <View className="ml-3.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
                <Skeleton className="mt-2 h-3 w-44" />
              </View>
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-light">
            <Ionicons name="chatbubble-ellipses-outline" size={30} color={COLORS.primary} />
          </View>
          <Text className="mt-4 text-center text-[17px] font-bold text-ink dark:text-ink-dark">No conversations yet</Text>
          <Text className="mt-1.5 text-center text-[13px] text-muted dark:text-muted-dark">
            Message a seller from any listing to start one.
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/explore' as never)} className="mt-5 rounded-full border border-border bg-card px-8 py-3 active:opacity-90 dark:border-border-dark dark:bg-card-dark">
            <Text className="text-[14px] font-semibold text-primary dark:text-primary-light">Browse listings</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item: InboxItemDto) => item.id}
          renderItem={({ item }: { item: InboxItemDto }) => (
            <Row item={item} onPress={() => router.push(`/conversation/${item.id}`)} />
          )}
          ItemSeparatorComponent={() => <View className="ml-[88px] h-px bg-border dark:bg-border-dark" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
        />
      )}
    </SafeAreaView>
  )
}
