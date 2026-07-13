/**
 * Notifications center — in-app notifications with unread highlighting,
 * tap-to-open (routes translated to app screens), and mark-all-read.
 */
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { EmptyState, ErrorState } from '@/components/ui'

type AppNotification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_message: 'chatbubble-outline',
  offer_received: 'pricetag-outline',
  counter_received: 'pricetag-outline',
  offer_accepted: 'checkmark-circle-outline',
  order_confirmed: 'checkmark-done-outline',
  contact_unlocked: 'call-outline',
  item_sold: 'trophy-outline',
  new_review: 'star-outline',
}

/** Web notification links → app routes. */
function toAppRoute(link: string | null): string | null {
  if (!link) return null
  const conv = link.match(/^\/messages\/([a-z0-9-]+)/i)
  if (conv) return `/conversation/${conv[1]}`
  const listing = link.match(/^\/listing\/([a-z0-9-]+)/i)
  if (listing) return `/listing/${listing[1]}`
  return null
}

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${Math.max(min, 1)}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export default function NotificationsScreen() {
  const router = useRouter()
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),
    refetchInterval: 30000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id)
    const route = toAppRoute(n.link)
    if (route) router.push(route as never)
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row items-center px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#0e5a43" />
        </Pressable>
        <Text className="ml-2 flex-1 text-lg font-bold text-ink dark:text-ink-dark">Notifications</Text>
        {(q.data?.unreadCount ?? 0) > 0 ? (
          <Pressable onPress={() => markAll.mutate()} hitSlop={8}>
            <Text className="text-sm font-medium text-primary dark:text-primary-light">Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {q.isError ? (
        <ErrorState message="Couldn't load notifications." onRetry={() => void q.refetch()} />
      ) : (q.data?.notifications.length ?? 0) === 0 && !q.isLoading ? (
        <EmptyState title="You're all caught up" body="Messages, offers, and order updates land here." />
      ) : (
        <FlashList
          data={q.data?.notifications ?? []}
          keyExtractor={(item: AppNotification) => item.id}
          renderItem={({ item }: { item: AppNotification }) => {
            const unread = !item.read_at
            return (
              <Pressable
                onPress={() => open(item)}
                className={`mx-4 mb-2 flex-row items-start rounded-qb border p-3 active:opacity-95 ${
                  unread
                    ? 'border-primary/25 bg-primary-light/60 dark:border-primary/40 dark:bg-card-dark'
                    : 'border-border bg-card dark:border-border-dark dark:bg-card-dark'
                }`}
              >
                <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-primary-light">
                  <Ionicons name={ICONS[item.type] ?? 'notifications-outline'} size={17} color="#0e5a43" />
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text numberOfLines={1} className={`flex-1 text-sm text-ink dark:text-ink-dark ${unread ? 'font-bold' : 'font-medium'}`}>
                      {item.title}
                    </Text>
                    {unread ? <View className="ml-2 h-2 w-2 rounded-full bg-primary" /> : null}
                  </View>
                  {item.body ? (
                    <Text numberOfLines={2} className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                      {item.body}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-[10px] text-muted dark:text-muted-dark">{timeAgo(item.created_at)}</Text>
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
