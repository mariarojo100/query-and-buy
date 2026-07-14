/**
 * Home — eyebrow + brand header, AI search bar, featured strip, one-row
 * scrolling category chips, fresh-finds grid. Mirrors the web landing
 * hierarchy with mobile-native density.
 */
import React from 'react'
import { Pressable, ScrollView, Text, View, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCategories, useFeaturedListings, useListingFeed } from '@/queries'
import { ListingCard } from '@/components/ListingCard'
import { Skeleton } from '@/components/ui'

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  vehicles: 'car-outline',
  cars: 'car-sport-outline',
  property: 'business-outline',
  'apartments-rent': 'key-outline',
  'apartments-sale': 'home-outline',
  electronics: 'tv-outline',
  computers: 'laptop-outline',
  mobiles: 'phone-portrait-outline',
  furniture: 'bed-outline',
  appliances: 'cube-outline',
  'tv-audio': 'headset-outline',
  motorcycles: 'bicycle-outline',
  gaming: 'game-controller-outline',
  cameras: 'camera-outline',
  fashion: 'shirt-outline',
  services: 'construct-outline',
}

export default function HomeScreen() {
  const router = useRouter()
  const categories = useCategories()
  const featured = useFeaturedListings()
  const feed = useListingFeed({ sort: 'newest' })

  const firstPage = feed.data?.pages[0]?.listings ?? []
  const total = feed.data?.pages[0]?.count ?? 0
  const refreshing = feed.isRefetching && !feed.isFetchingNextPage

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        showsVerticalScrollIndicator={false}
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
        <View className="px-5 pb-1 pt-4">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-muted dark:text-muted-dark">
            AI marketplace · UAE
          </Text>
          <Text className="mt-1 text-[26px] font-extrabold tracking-tight text-primary dark:text-primary-light">
            Query <Text className="text-accent">&</Text> Buy
          </Text>
          <Pressable
            onPress={() => router.push('/search')}
            className="mt-4 flex-row items-center rounded-full border border-border bg-card px-4 py-3.5 dark:border-border-dark dark:bg-card-dark"
          >
            <Ionicons name="sparkles" size={15} color="#c8a24a" />
            <Text className="ml-2.5 text-[14px] text-muted dark:text-muted-dark">
              Try “iPhone under 2000 in Dubai”
            </Text>
            <View className="ml-auto rounded-full bg-primary p-1.5">
              <Ionicons name="search" size={13} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* Categories — one scrolling row */}
        <View className="mt-5">
          <Text className="px-5 text-[16px] font-bold text-ink dark:text-ink-dark">Browse by category</Text>
          {categories.isLoading ? (
            <View className="mt-3 flex-row gap-2 px-5">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <Skeleton className="h-16 w-16 rounded-2xl" />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}
            >
              {(categories.data?.categories ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push({ pathname: '/search', params: { category: c.slug, label: c.name_en } })}
                  className="items-center active:opacity-80"
                  style={{ width: 74 }}
                >
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-light dark:bg-card-dark">
                    <Ionicons name={CATEGORY_ICONS[c.slug] ?? 'pricetag-outline'} size={22} color="#0e5a43" />
                  </View>
                  <Text numberOfLines={1} className="mt-1.5 text-[10.5px] font-medium text-ink dark:text-ink-dark">
                    {c.name_en}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Featured strip */}
        {(featured.data?.listings.length ?? 0) > 0 && (
          <View className="mt-6">
            <View className="flex-row items-baseline justify-between px-5">
              <Text className="text-[16px] font-bold text-ink dark:text-ink-dark">Featured</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 12 }}
            >
              {featured.data!.listings.map((l) => (
                <View key={l.id} style={{ width: 168 }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fresh finds */}
        <View className="mt-6 px-5 pb-12">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[16px] font-bold text-ink dark:text-ink-dark">Recently added</Text>
            {total > 0 ? (
              <Text className="text-[11px] text-muted dark:text-muted-dark">{total} live listings</Text>
            ) : null}
          </View>
          {feed.isLoading ? (
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="mt-2 h-4 w-20" />
              </View>
              <View className="flex-1">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="mt-2 h-4 w-20" />
              </View>
            </View>
          ) : (
            <View className="mt-3 flex-row flex-wrap justify-between">
              {firstPage.map((l) => (
                <View key={l.id} style={{ width: '48.4%' }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </View>
          )}
          {feed.hasNextPage && (
            <Pressable
              onPress={() => void feed.fetchNextPage()}
              className="mt-3 items-center rounded-full border border-border bg-card py-3 dark:border-border-dark dark:bg-card-dark"
            >
              <Text className="text-[13px] font-semibold text-primary dark:text-primary-light">
                {feed.isFetchingNextPage ? 'Loading…' : 'Show more'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
