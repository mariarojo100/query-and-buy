/**
 * My listings — the seller's inventory with status pills and lifecycle
 * actions: pause/resume, mark sold, delete (owner-only, enforced server-side).
 */
import React from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatPrice } from '@qb/shared'
import { api, ApiError } from '@/api/client'
import { listingImageUrl } from '@/lib/images'
import { COLORS } from '@/theme/colors'
import { EmptyState, ErrorState } from '@/components/ui'

type MyListing = {
  id: string
  title_en: string
  price_fils: number
  currency: string
  status: string
  view_count: number
  created_at: string
  cover_key: string | null
  favorites_count: number
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-primary-light text-primary' },
  draft: { label: 'Paused', cls: 'bg-border/60 text-muted' },
  reserved: { label: 'Reserved', cls: 'bg-accent/20 text-accent' },
  sold: { label: 'Sold', cls: 'bg-border/60 text-muted' },
  deleted: { label: 'Deleted', cls: 'bg-border/60 text-muted' },
}

export default function MyListingsScreen() {
  const router = useRouter()
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => api<{ listings: MyListing[] }>('/my/listings'),
  })

  const act = useMutation({
    mutationFn: (input: { id: string; action: 'pause' | 'resume' | 'sold' | 'delete' }) =>
      api(`/listings/${input.id}/${input.action}`, { method: 'POST' }),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['my-listings'] }),
    onError: (e) => Alert.alert('Not possible', e instanceof ApiError ? e.message : 'Try again.'),
  })

  const manage = (l: MyListing) => {
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = []
    if (l.status === 'active') {
      buttons.push({ text: 'Mark as sold', onPress: () => act.mutate({ id: l.id, action: 'sold' }) })
      buttons.push({ text: 'Pause listing', onPress: () => act.mutate({ id: l.id, action: 'pause' }) })
    }
    if (l.status === 'draft') {
      buttons.push({ text: 'Resume listing', onPress: () => act.mutate({ id: l.id, action: 'resume' }) })
    }
    if (l.status !== 'deleted') {
      buttons.push({
        text: 'Delete listing',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete this listing?', 'It comes off the marketplace immediately.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => act.mutate({ id: l.id, action: 'delete' }) },
          ]),
      })
    }
    buttons.push({ text: 'Cancel', style: 'cancel' })
    Alert.alert(l.title_en, undefined, buttons)
  }

  const rows = (q.data?.listings ?? []).filter((l) => l.status !== 'deleted')

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row items-center px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
        </Pressable>
        <Text className="ml-2 flex-1 text-[18px] font-extrabold text-ink dark:text-ink-dark">My listings</Text>
        <Pressable onPress={() => router.push('/sell/new')} hitSlop={8} accessibilityLabel="Create a listing">
          <Ionicons name="add-circle" size={26} color={COLORS.primary} />
        </Pressable>
      </View>

      {q.isError ? (
        <ErrorState message="Couldn't load your listings." onRetry={() => void q.refetch()} />
      ) : rows.length === 0 && !q.isLoading ? (
        <EmptyState title="Nothing listed yet" body="Snap a few photos and your first listing is live in under a minute." />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(item: MyListing) => item.id}
          renderItem={({ item }: { item: MyListing }) => {
            const cover = listingImageUrl(item.cover_key)
            const st = STATUS_STYLE[item.status] ?? { label: item.status, cls: 'bg-border/60 text-muted' }
            return (
              <Pressable
                onPress={() => router.push(`/listing/${item.id}`)}
                onLongPress={() => manage(item)}
                className="mx-4 mb-2 flex-row items-center rounded-qb border border-border bg-card p-3 active:opacity-95 dark:border-border-dark dark:bg-card-dark"
              >
                <View className="h-16 w-16 overflow-hidden rounded-2xl bg-border/40 dark:bg-border-dark/40">
                  {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View className="ml-3 flex-1">
                  <Text numberOfLines={1} className="text-sm font-semibold text-ink dark:text-ink-dark">
                    {item.title_en}
                  </Text>
                  <Text className="mt-0.5 text-sm font-bold text-primary dark:text-primary-light">
                    {formatPrice(item.price_fils, item.currency)}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-3">
                    <View className={`rounded-full px-2 py-0.5 ${st.cls.split(' ')[0]}`}>
                      <Text className={`text-[10px] font-bold ${st.cls.split(' ')[1]}`}>{st.label}</Text>
                    </View>
                    <Text className="text-[11px] text-muted dark:text-muted-dark">
                      {item.view_count} views · {item.favorites_count} saves
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => manage(item)} hitSlop={8} className="p-1" accessibilityLabel="Manage listing">
                  <Ionicons name="ellipsis-vertical" size={18} color={COLORS.muted} />
                </Pressable>
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
