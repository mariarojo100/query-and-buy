/**
 * Home — premium light-first marketplace landing.
 * Header (wordmark · live emirate filter · notifications · avatar) →
 * AI discovery hero (headline, search entry, real trending chips) →
 * category tiles (See all → Explore) → shelves (Featured, Recently added).
 * Every element is backed by live data; nothing decorative pretends to work.
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
import { Chip, SectionHeader, Skeleton } from '@/components/ui'

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
        {/* ── Header ─────────────────────────────────────────────── */}
        <View className="flex-row items-center px-6 pt-3">
          <View className="flex-1">
            <Text className="text-[21px] font-extrabold tracking-tight text-primary-dark dark:text-ink-dark">
              Query <Text className="text-accent">&</Text> Buy
            </Text>
            <Pressable onPress={pickEmirate} hitSlop={8} className="mt-0.5 flex-row items-center" accessibilityLabel="Choose emirate">
              <Ionicons name="location" size={11} color={COLORS.primary} />
              <Text className="ml-1 text-[12px] font-semibold text-primary dark:text-primary-light">{emirateLabel}</Text>
              <Ionicons name="chevron-down" size={11} color={COLORS.primary} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => (user ? router.push('/account/notifications' as never) : router.push('/(auth)/login'))}
            hitSlop={6}
            accessibilityLabel="Notifications"
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card dark:border-border-dark dark:bg-card-dark"
          >
            <Ionicons name="notifications-outline" size={18} color={COLORS.muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push(user ? '/(tabs)/account' : '/(auth)/login')}
            hitSlop={6}
            accessibilityLabel="Profile"
            className="ml-2.5 h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-light"
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text className="text-[14px] font-bold text-primary">{(user?.displayName ?? 'G').slice(0, 1).toUpperCase()}</Text>
            )}
          </Pressable>
        </View>

        {/* ── AI discovery ───────────────────────────────────────── */}
        <View className="px-6 pt-7">
          <Text className="text-[32px] font-extrabold leading-[36px] tracking-tight text-ink dark:text-ink-dark">
            Find almost{'\n'}anything.
          </Text>
          <Text className="mt-2 text-[14px] leading-[20px] text-muted dark:text-muted-dark">
            AI-powered search across the UAE’s marketplace — just say what you want.
          </Text>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityLabel="Search the marketplace"
            className="mt-5 flex-row items-center rounded-2xl border border-border bg-card px-4 py-4 dark:border-border-dark dark:bg-card-dark"
            style={{ shadowColor: COLORS.primary, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
          >
            <Ionicons name="search" size={18} color={COLORS.muted} />
            <Text numberOfLines={1} className="ml-3 flex-1 text-[14.5px] text-muted dark:text-muted-dark">
              iPhone 15 under AED 2,000 in Dubai…
            </Text>
            <View className="flex-row items-center rounded-full bg-accent/15 px-2 py-1">
              <Ionicons name="sparkles" size={11} color={COLORS.accentDeep} />
              <Text className="ml-1 text-[10px] font-bold text-accent-deep">AI</Text>
            </View>
          </Pressable>
          <View className="mt-3.5 flex-row flex-wrap gap-2">
            {popular.map((c) => (
              <Chip key={c} label={c} onPress={() => router.push({ pathname: '/search', params: { q: c } })} />
            ))}
          </View>
        </View>

        {/* ── Categories ─────────────────────────────────────────── */}
        <View className="mt-8">
          <SectionHeader title="Browse categories" action="See all" onAction={() => router.push('/(tabs)/explore' as never)} />
          {categories.isLoading ? (
            <View className="mt-4 flex-row gap-3 px-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[64px] w-[64px] rounded-full" />
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, gap: 18 }}>
              {(categories.data?.categories ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push({ pathname: '/search', params: { category: c.slug, label: c.name_en } })}
                  className="items-center active:opacity-80"
                  style={{ width: 68 }}
                  accessibilityLabel={`Browse ${c.name_en}`}
                >
                  <View className="h-[60px] w-[60px] items-center justify-center rounded-full bg-primary-light dark:bg-card-dark">
                    <Ionicons name={CATEGORY_ICONS[c.slug] ?? 'pricetag'} size={23} color={COLORS.primary} />
                  </View>
                  <Text numberOfLines={1} className="mt-2 text-[10.5px] font-semibold text-ink dark:text-ink-dark">
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
            <SectionHeader title="Featured" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, gap: 14 }}>
              {featured.data!.listings.map((l) => (
                <View key={l.id} style={{ width: 190 }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Recently added ─────────────────────────────────────── */}
        <View className="mt-8 pb-14">
          <SectionHeader
            title="Recently added"
            action={total > 0 ? `${total} live` : undefined}
            onAction={() => router.push('/(tabs)/explore' as never)}
          />
          {feed.isLoading ? (
            <View className="mt-4 flex-row gap-4 px-6">
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
          ) : firstPage.length === 0 ? (
            <Text className="mt-6 px-6 text-center text-[13px] text-muted dark:text-muted-dark">
              Nothing here yet{emirate ? ` in ${emirateLabel}` : ''} — check back soon.
            </Text>
          ) : (
            <View className="mt-4 flex-row flex-wrap justify-between px-6">
              {firstPage.map((l) => (
                <View key={l.id} style={{ width: '47.8%' }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </View>
          )}
          {feed.hasNextPage && (
            <Pressable
              onPress={() => void feed.fetchNextPage()}
              className="mx-6 mt-2 items-center rounded-full border border-border bg-card py-3.5 dark:border-border-dark dark:bg-card-dark"
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
