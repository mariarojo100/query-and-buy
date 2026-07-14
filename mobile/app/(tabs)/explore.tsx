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
import { EmptyState, ErrorState } from '@/components/ui'
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
      <View className="px-6 pb-1 pt-3">
        <Text className="text-[24px] font-extrabold tracking-tight text-ink dark:text-ink-dark">Explore</Text>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityLabel="Search the marketplace"
          className="mt-3 flex-row items-center rounded-2xl border border-border bg-card px-4 py-3.5 dark:border-border-dark dark:bg-card-dark"
        >
          <Ionicons name="search" size={17} color={COLORS.muted} />
          <Text className="ml-2.5 flex-1 text-[14px] text-muted dark:text-muted-dark">Search anything…</Text>
          <Ionicons name="sparkles" size={14} color={COLORS.accent} />
        </Pressable>
      </View>

      <View className="mt-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 10, gap: 8 }}>
          <Pressable
            onPress={() => setCategory(null)}
            className={`rounded-full px-4 py-2 ${category === null ? 'bg-primary' : 'border border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
          >
            <Text className={`text-[12.5px] font-semibold ${category === null ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>All</Text>
          </Pressable>
          {(categories.data?.categories ?? []).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.slug)}
              className={`rounded-full px-4 py-2 ${category === c.slug ? 'bg-primary' : 'border border-border bg-card dark:border-border-dark dark:bg-card-dark'}`}
            >
              <Text className={`text-[12.5px] font-semibold ${category === c.slug ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>
                {c.name_en}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {feed.isError ? (
        <ErrorState message="Couldn't load listings." onRetry={() => void feed.refetch()} />
      ) : listings.length === 0 && !feed.isLoading ? (
        <EmptyState title="No listings here yet" body="Try another category, or check back soon." />
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
              <Text className="pb-2 pl-2 text-[12px] text-muted dark:text-muted-dark">{total} live listings</Text>
            ) : null
          }
          contentContainerStyle={{ paddingHorizontal: 17, paddingTop: 6, paddingBottom: 28 }}
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
