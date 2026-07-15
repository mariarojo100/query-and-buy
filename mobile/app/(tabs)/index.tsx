/**
 * Home — premium light-first marketplace landing.
 * Compact header (wordmark · live emirate filter · notifications · avatar) →
 * a prominent AI search field (the hero is the search, not a headline) →
 * category squircles → shelves (Featured, Recently added). Marketplace content
 * reaches the first viewport; every element is backed by live data.
 */
import React, { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { EMIRATES } from '@qb/shared'
import { api } from '@/api/client'
import { useCategories, useFeaturedListings, useListingFeed } from '@/queries'
import { useAuth } from '@/auth/AuthContext'
import { ListingCard } from '@/components/ListingCard'
import { COLORS } from '@/theme/colors'
import { Chip, IconButton, SectionHeader, Skeleton } from '@/components/ui'

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  vehicles: 'car-sport',
  cars: 'car',
  property: 'business',
  'apartments-rent': 'key',
  'apartments-sale': 'home',
  electronics: 'tv',
  computers: 'laptop',
  mobiles: 'phone-portrait',
  furniture: 'bed',
  appliances: 'cube',
  'tv-audio': 'headset',
  motorcycles: 'bicycle',
  gaming: 'game-controller',
  cameras: 'camera',
  fashion: 'shirt',
  services: 'construct',
}

const FALLBACK_CHIPS = ['iPhone', 'Toyota', 'PlayStation 5', 'Apartment in Dubai']

export default function HomeScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const categories = useCategories()
  const featured = useFeaturedListings()
  const [emirate, setEmirate] = useState<string | null>(null)
  const feed = useListingFeed(emirate ? { sort: 'newest', emirate } : { sort: 'newest' })

  const trending = useQuery({
    queryKey: ['trending'],
    queryFn: () => api<{ suggestions: { type?: string; query?: string; label?: string }[] }>('/search/suggestions?prefix=', { anonymous: true }),
    staleTime: 5 * 60_000,
  })
  const chips = (trending.data?.suggestions ?? [])
    .map((s) => s.query ?? s.label ?? '')
    .filter(Boolean)
    .slice(0, 4)
  const popular = chips.length > 0 ? chips : FALLBACK_CHIPS

  const pickEmirate = () => {
    Alert.alert('Browse in…', undefined, [
      { text: 'All Emirates', onPress: () => setEmirate(null) },
      ...EMIRATES.map((e) => ({ text: e.label, onPress: () => setEmirate(e.value) })),
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

  const emirateLabel = EMIRATES.find((e) => e.value === emirate)?.label ?? 'All Emirates'
  const firstPage = feed.data?.pages[0]?.listings ?? []
  const total = feed.data?.pages[0]?.count ?? 0
  const refreshing = feed.isRefetching && !feed.isFetchingNextPage

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={COLORS.primary}
            onRefresh={() => {
              void feed.refetch()
              void featured.refetch()
            }}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View className="flex-row items-center px-5 pt-2">
          <View className="flex-1">
            <Text className="text-[20px] font-extrabold tracking-tight text-primary-dark dark:text-ink-dark">
              Query <Text className="text-accent">&</Text> Buy
            </Text>
            <Pressable onPress={pickEmirate} hitSlop={8} className="mt-0.5 flex-row items-center" accessibilityLabel="Choose emirate">
              <Ionicons name="location" size={12} color={COLORS.primary} />
              <Text className="ml-1 text-[12.5px] font-semibold text-primary dark:text-primary-light">{emirateLabel}</Text>
              <Ionicons name="chevron-down" size={12} color={COLORS.primary} />
            </Pressable>
          </View>
          <IconButton
            icon="notifications-outline"
            accessibilityLabel="Notifications"
            onPress={() => (user ? router.push('/account/notifications' as never) : router.push('/(auth)/login'))}
          />
          <Pressable
            onPress={() => router.push(user ? '/(tabs)/account' : '/(auth)/login')}
            hitSlop={6}
            accessibilityLabel="Profile"
            className="ml-2.5 h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-primary-light dark:border-border-dark dark:bg-primary/15"
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text className="text-[15px] font-bold text-primary dark:text-primary-light">{(user?.displayName ?? 'G').slice(0, 1).toUpperCase()}</Text>
            )}
          </Pressable>
        </View>

        {/* ── Search (the hero) ──────────────────────────────────── */}
        <View className="px-5 pt-5">
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityLabel="Search the marketplace"
            className="flex-row items-center rounded-2xl border border-border bg-card px-4 dark:border-border-dark dark:bg-card-dark"
            style={{ height: 56, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}
          >
            <Ionicons name="search" size={19} color={COLORS.muted} />
            <Text numberOfLines={1} className="ml-3 flex-1 text-[14.5px] text-muted dark:text-muted-dark">
              iPhone 15 under AED 2,000 in Dubai…
            </Text>
            <View className="flex-row items-center rounded-full bg-accent/15 px-2.5 py-1.5">
              <Ionicons name="sparkles" size={12} color={COLORS.accentDeep} />
              <Text className="ml-1 text-[10.5px] font-bold text-accent-deep">AI</Text>
            </View>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12, gap: 8 }} className="-mx-5 px-5">
            {popular.map((c) => (
              <Chip key={c} label={c} onPress={() => router.push({ pathname: '/search', params: { q: c } })} />
            ))}
          </ScrollView>
        </View>

        {/* ── Categories ─────────────────────────────────────────── */}
        <View className="mt-7">
          <SectionHeader title="Browse categories" action="See all" onAction={() => router.push('/(tabs)/explore' as never)} />
          {categories.isLoading ? (
            <View className="mt-3.5 flex-row gap-3 px-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[62px] w-[62px] rounded-2xl" />
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 12 }}>
              {(categories.data?.categories ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push({ pathname: '/search', params: { category: c.slug, label: c.name_en } })}
                  className="items-center active:opacity-80"
                  style={{ width: 72 }}
                  accessibilityLabel={`Browse ${c.name_en}`}
                >
                  <View className="h-[62px] w-[62px] items-center justify-center rounded-2xl border border-border bg-card dark:border-border-dark dark:bg-card-dark">
                    <Ionicons name={CATEGORY_ICONS[c.slug] ?? 'pricetag'} size={24} color={COLORS.primary} />
                  </View>
                  <Text numberOfLines={2} className="mt-1.5 text-center text-[10.5px] font-semibold leading-[13px] text-ink-soft dark:text-ink-soft-dark">
                    {c.name_en}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Featured shelf ─────────────────────────────────────── */}
        {(featured.data?.listings.length ?? 0) > 0 && (
          <View className="mt-8">
            <SectionHeader title="Featured" caption="Hand-picked listings" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 14 }}>
              {featured.data!.listings.map((l) => (
                <View key={l.id} style={{ width: 200 }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Recently added ─────────────────────────────────────── */}
        <View className="mt-8">
          <SectionHeader
            title="Recently added"
            caption={total > 0 ? `${total} live in ${emirateLabel}` : undefined}
            action="See all"
            onAction={() => router.push('/(tabs)/explore' as never)}
          />
          {feed.isLoading ? (
            <View className="mt-4 flex-row gap-4 px-5">
              <View className="flex-1">
                <Skeleton className="h-[130px] w-full rounded-img" />
                <Skeleton className="mt-2.5 h-4 w-24" />
                <Skeleton className="mt-1.5 h-3 w-32" />
              </View>
              <View className="flex-1">
                <Skeleton className="h-[130px] w-full rounded-img" />
                <Skeleton className="mt-2.5 h-4 w-24" />
                <Skeleton className="mt-1.5 h-3 w-32" />
              </View>
            </View>
          ) : feed.isError ? (
            <View className="mt-6 items-center px-6">
              <Text className="text-center text-[13px] text-muted dark:text-muted-dark">Couldn’t load listings.</Text>
              <Pressable onPress={() => void feed.refetch()} className="mt-3 rounded-full border border-border bg-card px-6 py-2.5 active:opacity-90 dark:border-border-dark dark:bg-card-dark">
                <Text className="text-[13px] font-semibold text-primary dark:text-primary-light">Try again</Text>
              </Pressable>
            </View>
          ) : firstPage.length === 0 ? (
            <View className="mt-4 mx-5 items-center rounded-card border border-border bg-card px-6 py-10 dark:border-border-dark dark:bg-card-dark">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
                <Ionicons name="pricetags-outline" size={26} color={COLORS.primary} />
              </View>
              <Text className="mt-3 text-center text-[14.5px] font-bold text-ink dark:text-ink-dark">
                Nothing here yet{emirate ? ` in ${emirateLabel}` : ''}
              </Text>
              <Text className="mt-1 text-center text-[12.5px] text-muted dark:text-muted-dark">Be the first to list — it takes under a minute.</Text>
            </View>
          ) : (
            <View className="mt-4 flex-row flex-wrap justify-between px-5">
              {firstPage.map((l) => (
                <View key={l.id} style={{ width: '48%' }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </View>
          )}
          {feed.hasNextPage && (
            <Pressable
              onPress={() => void feed.fetchNextPage()}
              className="mx-5 mt-1 items-center rounded-2xl border border-border bg-card py-3.5 active:opacity-90 dark:border-border-dark dark:bg-card-dark"
            >
              <Text className="text-[13.5px] font-semibold text-primary dark:text-primary-light">
                {feed.isFetchingNextPage ? 'Loading…' : 'Show more'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
