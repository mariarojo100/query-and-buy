/**
 * Explore — the full live catalog: search entry, category chips, and the
 * infinite grid of every active listing. All data is real (same feed API).
 */
import React, { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCategories, useListingFeed } from '@/queries'
import { ListingCard } from '@/components/ListingCard'
import { COLORS } from '@/theme/colors'
import { CardGridSkeleton, Chip, EmptyState, ErrorState } from '@/components/ui'
import type { FeedListingDto } from '@qb/shared'

export default function ExploreScreen() {
  const router = useRouter()
  const categories = useCategories()
  const [category, setCategory] = useState<string | null>(null)
  const feed = useListingFeed(category ? { sort: 'newest', category } : { sort: 'newest' })

  const listings = feed.data?.pages.flatMap((p) => p.listings) ?? []
  const total = feed.data?.pages[0]?.count ?? 0

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="px-5 pb-1 pt-2">
        <Text className="text-[26px] font-extrabold tracking-tight text-ink dark:text-ink-dark">Explore</Text>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityLabel="Search the marketplace"
          className="mt-3 flex-row items-center rounded-2xl border border-border bg-card px-4 dark:border-border-dark dark:bg-card-dark"
          style={{ height: 52 }}
        >
          <Ionicons name="search" size={18} color={COLORS.muted} />
          <Text className="ml-2.5 flex-1 text-[14px] text-muted dark:text-muted-dark">Search anything…</Text>
          <View className="flex-row items-center rounded-full bg-accent/15 px-2 py-1">
            <Ionicons name="sparkles" size={11} color={COLORS.accentDeep} />
            <Text className="ml-1 text-[10px] font-bold text-accent-deep">AI</Text>
          </View>
        </Pressable>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
          <Chip label="All" selected={category === null} onPress={() => setCategory(null)} />
          {(categories.data?.categories ?? []).map((c) => (
            <Chip key={c.id} label={c.name_en} selected={category === c.slug} onPress={() => setCategory(c.slug)} />
          ))}
        </ScrollView>
      </View>

      {feed.isError ? (
        <ErrorState message="Couldn't load listings." onRetry={() => void feed.refetch()} />
      ) : feed.isLoading ? (
        <CardGridSkeleton />
      ) : listings.length === 0 ? (
        <EmptyState icon="compass-outline" title="No listings here yet" body="Try another category, or check back soon." />
      ) : (
        <FlashList
          data={listings}
          numColumns={2}
          keyExtractor={(item: FeedListingDto) => item.id}
          renderItem={({ item }: { item: FeedListingDto }) => (
            <View style={{ flex: 1, paddingHorizontal: 7 }}>
              <ListingCard listing={item} />
            </View>
          )}
          ListHeaderComponent={
            total > 0 ? (
              <Text className="pb-2.5 pl-2 text-[12.5px] font-medium text-muted dark:text-muted-dark">{total} live {total === 1 ? 'listing' : 'listings'}</Text>
            ) : null
          }
          contentContainerStyle={{ paddingHorizontal: 17, paddingTop: 4, paddingBottom: 36 }}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage()
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator className="my-4" color={COLORS.primary} /> : null}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => void feed.refetch()}
        />
      )}
    </SafeAreaView>
  )
}
