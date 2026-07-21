/**
 * Home — premium marketplace landing (matches the approved design).
 * Header → AI search → category filter row → hero banner → category tiles →
 * Featured picks → Recently added → AI-listing promo. Filter chips filter the
 * live feed by category; every element is backed by real data.
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
import { HeroBanner } from '@/components/home/HeroBanner'
import { AiPromoCard } from '@/components/home/AiPromoCard'
import { COLORS } from '@/theme/colors'
import { Chip, SectionHeader, Skeleton } from '@/components/ui'

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  vehicles: 'car-sport-outline',
  cars: 'car-outline',
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
  const { user } = useAuth()
  const categories = useCategories()
  const featured = useFeaturedListings()
  const [emirate, setEmirate] = useState<string | null>(null)
  const [cat, setCat] = useState<string | null>(null)
  const feed = useListingFeed({
    sort: 'newest',
    ...(emirate ? { emirate } : {}),
    ...(cat ? { category: cat } : {}),
  })

  const trending = useQuery({
    queryKey: ['trending'],
    queryFn: () => api<{ suggestions: { type?: string; query?: string; label?: string }[] }>('/search/suggestions?prefix=', { anonymous: true }),
    staleTime: 5 * 60_000,
  })
  void trending // reserved for future search suggestions

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
  const cats = categories.data?.categories ?? []
  const filterCats = cats.slice(0, 5)

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
            <Text className="text-[20px] font-extrabold tracking-tight text-ink">
              Query <Text className="text-accent">&</Text> Buy
            </Text>
            <Pressable onPress={pickEmirate} hitSlop={8} className="mt-0.5 flex-row items-center" accessibilityLabel="Choose emirate">
              <Ionicons name="location" size={12} color={COLORS.accentDeep} />
              <Text className="ml-1 text-[12.5px] font-semibold text-ink">{emirateLabel}</Text>
              <Ionicons name="chevron-down" size={12} color={COLORS.inkSoft} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => (user ? router.push('/account/notifications' as never) : router.push('/(auth)/login'))}
            hitSlop={10}
            accessibilityLabel="Notifications"
            className="h-10 w-10 items-center justify-center active:opacity-60"
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.ink} />
          </Pressable>
          <Pressable
            onPress={() => router.push(user ? '/(tabs)/account' : '/(auth)/login')}
            hitSlop={6}
            accessibilityLabel="Profile"
            className="ml-1.5 h-10 w-10 items-center justify-center overflow-hidden rounded-full"
            style={{ backgroundColor: '#D8D2C6' }}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text className="text-[15px] font-bold text-ink">{(user?.displayName ?? 'G').slice(0, 1).toUpperCase()}</Text>
            )}
          </Pressable>
        </View>

        {/* ── Search ─────────────────────────────────────────────── */}
        <View className="px-5 pt-4">
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityLabel="Search the marketplace"
            className="flex-row items-center rounded-2xl border border-border bg-card px-4 dark:border-border-dark dark:bg-card-dark"
            style={{ height: 54, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}
          >
            <Ionicons name="search" size={19} color={COLORS.muted} />
            <Text numberOfLines={1} className="ml-3 flex-1 text-[14px] text-muted dark:text-muted-dark">
              Search for items, brands or categories…
            </Text>
            <View className="flex-row items-center rounded-full px-2.5 py-1.5" style={{ backgroundColor: COLORS.accentLight }}>
              <Ionicons name="sparkles" size={12} color={COLORS.accentDeep} />
              <Text className="ml-1 text-[10.5px] font-bold text-accent-deep">AI</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Category filter chips ──────────────────────────────── */}
        <View className="flex-row items-center pt-3.5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} className="flex-1">
            <Chip label="All" selected={cat === null} onPress={() => setCat(null)} />
            {filterCats.map((c) => (
              <Chip key={c.id} label={c.name_en} selected={cat === c.slug} onPress={() => setCat(c.slug)} />
            ))}
          </ScrollView>
          <Pressable
            onPress={() => router.push('/(tabs)/explore' as never)}
            accessibilityLabel="More filters"
            hitSlop={6}
            className="mr-5 h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:opacity-80 dark:border-border-dark dark:bg-card-dark"
          >
            <Ionicons name="options-outline" size={19} color={COLORS.inkSoft} />
          </Pressable>
        </View>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <View className="pt-4">
          <HeroBanner
            onList={() => router.push(user ? '/sell/new' : '/(auth)/login')}
            onExplore={() => router.push('/(tabs)/explore' as never)}
          />
        </View>

        {/* ── Categories ─────────────────────────────────────────── */}
        <View className="mt-7">
          <SectionHeader title="Browse by category" action="See all" onAction={() => router.push('/(tabs)/explore' as never)} />
          {categories.isLoading ? (
            <View className="mt-3.5 flex-row gap-3 px-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[58px] w-[58px] rounded-2xl" />
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 14 }}>
              {cats.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push({ pathname: '/search', params: { category: c.slug, label: c.name_en } })}
                  className="items-center active:opacity-80"
                  style={{ width: 66 }}
                  accessibilityLabel={`Browse ${c.name_en}`}
                >
                  <View className="h-[58px] w-[58px] items-center justify-center rounded-2xl border border-border bg-card dark:border-border-dark dark:bg-card-dark">
                    <Ionicons name={CATEGORY_ICONS[c.slug] ?? 'pricetag-outline'} size={24} color={COLORS.ink} />
                  </View>
                  <Text numberOfLines={2} className="mt-1.5 text-center text-[10.5px] font-semibold leading-[13px] text-ink-soft dark:text-ink-soft-dark">
                    {c.name_en}
                  </Text>
                </Pressable>
              ))}
              {/* More */}
              <Pressable
                onPress={() => router.push('/(tabs)/explore' as never)}
                className="items-center active:opacity-80"
                style={{ width: 66 }}
                accessibilityLabel="All categories"
              >
                <View className="h-[58px] w-[58px] items-center justify-center rounded-2xl border border-border bg-sunken dark:border-border-dark dark:bg-sunken-dark">
                  <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.muted} />
                </View>
                <Text className="mt-1.5 text-center text-[10.5px] font-semibold text-ink-soft dark:text-ink-soft-dark">More</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>

        {/* ── Featured picks ─────────────────────────────────────── */}
        {(featured.data?.listings.length ?? 0) > 0 && (
          <View className="mt-8">
            <SectionHeader title="Featured picks" caption="Handpicked premium listings" action="See all" onAction={() => router.push('/(tabs)/explore' as never)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 14 }}>
              {featured.data!.listings.map((l) => (
                <View key={l.id} style={{ width: 168 }}>
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
            caption={total > 0 ? `${total} live${cat ? '' : ` in ${emirateLabel}`}` : undefined}
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
            <View className="mx-5 mt-4 items-center rounded-card border border-border bg-card px-6 py-10 dark:border-border-dark dark:bg-card-dark">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
                <Ionicons name="pricetags-outline" size={26} color={COLORS.primary} />
              </View>
              <Text className="mt-3 text-center text-[14.5px] font-bold text-ink dark:text-ink-dark">
                Nothing here yet{cat ? '' : emirate ? ` in ${emirateLabel}` : ''}
              </Text>
              <Text className="mt-1 text-center text-[12.5px] text-muted dark:text-muted-dark">Try another category or be the first to list.</Text>
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
              className="mx-5 mt-2 items-center rounded-2xl border border-border bg-card py-3.5 active:opacity-90 dark:border-border-dark dark:bg-card-dark"
            >
              <Text className="text-[13.5px] font-semibold text-primary dark:text-primary-light">
                {feed.isFetchingNextPage ? 'Loading…' : 'Show more'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── AI listing promo ───────────────────────────────────── */}
        <View className="mt-8">
          <AiPromoCard onStart={() => router.push(user ? '/sell/new' : '/(auth)/login')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
