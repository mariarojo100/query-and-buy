/**
 * Home — search bar, featured strip, category grid, fresh-finds feed.
 * Mirrors the web landing hierarchy in a mobile-native layout.
 */
import React from 'react'
import { Pressable, ScrollView, Text, View, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCategories, useFeaturedListings, useListingFeed } from '@/queries'
import { ListingCard } from '@/components/ListingCard'
import { Skeleton } from '@/components/ui'

export default function HomeScreen() {
  const router = useRouter()
  const categories = useCategories()
  const featured = useFeaturedListings()
  const feed = useListingFeed({ sort: 'newest' })

  const firstPage = feed.data?.pages[0]?.listings ?? []
  const refreshing = feed.isRefetching && !feed.isFetchingNextPage

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void feed.refetch()
              void featured.refetch()
            }}
          />
        }
      >
        {/* Header + search */}
        <View className="px-5 pb-2 pt-3">
          <Text className="text-2xl font-extrabold tracking-tight text-primary dark:text-primary-light">
            Query <Text className="text-accent">&</Text> Buy
          </Text>
          <Pressable
            onPress={() => router.push('/search')}
            className="mt-3 flex-row items-center rounded-full border border-border bg-card px-4 py-3 dark:border-border-dark dark:bg-card-dark"
          >
            <Ionicons name="search" size={18} color="#8a8578" />
            <Text className="ml-2 text-base text-muted dark:text-muted-dark">
              Search naturally — “iPhone under 2000”
            </Text>
          </Pressable>
        </View>

        {/* Featured */}
        {(featured.data?.listings.length ?? 0) > 0 && (
          <View className="mt-4">
            <Text className="px-5 text-lg font-bold text-ink dark:text-ink-dark">Featured</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 12 }}>
              {featured.data!.listings.map((l) => (
                <View key={l.id} style={{ width: 170 }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View className="mt-2 px-5">
          <Text className="text-lg font-bold text-ink dark:text-ink-dark">Browse by category</Text>
          {categories.isLoading ? (
            <View className="mt-3 flex-row gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </View>
          ) : (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {(categories.data?.categories ?? []).slice(0, 10).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push({ pathname: '/search', params: { category: c.slug, label: c.name_en } })}
                  className="rounded-full border border-border bg-card px-4 py-2 active:bg-primary-light dark:border-border-dark dark:bg-card-dark"
                >
                  <Text className="text-sm font-medium text-ink dark:text-ink-dark">{c.name_en}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Fresh finds */}
        <View className="mt-6 px-5 pb-10">
          <Text className="text-lg font-bold text-ink dark:text-ink-dark">Recently added</Text>
          {feed.isLoading ? (
            <View className="mt-3 flex-row gap-3">
              <Skeleton className="aspect-square flex-1" />
              <Skeleton className="aspect-square flex-1" />
            </View>
          ) : (
            <View className="mt-3 flex-row flex-wrap justify-between">
              {firstPage.map((l) => (
                <View key={l.id} style={{ width: '48.5%' }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </View>
          )}
          {feed.hasNextPage && (
            <Pressable
              onPress={() => void feed.fetchNextPage()}
              className="mt-2 items-center rounded-full border border-border py-3 dark:border-border-dark"
            >
              <Text className="font-semibold text-primary dark:text-primary-light">
                {feed.isFetchingNextPage ? 'Loading…' : 'Show more'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
