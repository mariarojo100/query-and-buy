/**
 * Search — natural-language input (server AI parse with heuristic fallback)
 * + infinite results grid. Category chips arrive via route params from Home.
 */
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useListingFeed, parseSearch } from '@/queries'
import { ListingCard } from '@/components/ListingCard'
import { COLORS } from '@/theme/colors'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui'
import type { FeedListingDto } from '@qb/shared'

export default function SearchScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ category?: string; label?: string; q?: string }>()
  const [text, setText] = useState(params.q ?? '')
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { sort: 'newest' }
    if (params.q) initial.q = params.q
    else if (params.category) initial.category = params.category
    return initial
  })
  const [aiUsed, setAiUsed] = useState(false)
  const [parsing, setParsing] = useState(false)

  const feed = useListingFeed(filters)

  const submit = useCallback(async () => {
    const raw = text.trim()
    if (!raw) return
    setParsing(true)
    try {
      const parsed = await parseSearch(raw)
      const next: Record<string, string> = { sort: parsed.filters.sort ?? 'newest' }
      if (parsed.query) next.q = parsed.query
      if (parsed.filters.category) next.category = parsed.filters.category
      if (parsed.filters.emirate) next.emirate = parsed.filters.emirate
      if (parsed.filters.condition) next.condition = parsed.filters.condition
      if (parsed.filters.min) next.minAed = parsed.filters.min
      if (parsed.filters.max) next.maxAed = parsed.filters.max
      setAiUsed(parsed.aiUsed)
      setFilters(next)
    } catch {
      setAiUsed(false)
      setFilters({ q: raw, sort: 'newest' })
    } finally {
      setParsing(false)
    }
  }, [text])

  const listings = feed.data?.pages.flatMap((p) => p.listings) ?? []
  const total = feed.data?.pages[0]?.count ?? 0

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      {/* Search header */}
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
        </Pressable>
        <View className="flex-1 flex-row items-center rounded-full border border-border bg-card px-4 dark:border-border-dark dark:bg-card-dark">
          <Ionicons name="sparkles-outline" size={16} color={COLORS.accent} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => void submit()}
            placeholder={params.label ? `Search ${params.label}…` : 'Try “Toyota under 50k in Dubai”'}
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
            autoFocus={!params.category}
            className="ml-2 flex-1 py-3 text-base text-ink dark:text-ink-dark"
          />
          {parsing ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
        </View>
      </View>

      {/* Result meta */}
      {(filters.q || filters.category) && !feed.isLoading ? (
        <View className="flex-row items-center gap-2 px-5 pb-2">
          <Text className="text-sm text-muted dark:text-muted-dark">{total} results</Text>
          {aiUsed ? (
            <View className="rounded-full bg-primary-light dark:bg-primary/15 px-2 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-primary">AI filters</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {feed.isError ? (
        <ErrorState message="Couldn't load results." onRetry={() => void feed.refetch()} />
      ) : feed.isLoading ? (
        <CardGridSkeleton />
      ) : listings.length === 0 ? (
        <EmptyState icon="search-outline" title="No results" body="Try different keywords or remove some filters." />
      ) : (
        <FlashList
          data={listings}
          numColumns={2}
          keyExtractor={(item: FeedListingDto) => item.id}
          renderItem={({ item }: { item: FeedListingDto }) => (
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <ListingCard listing={item} />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage()
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator className="my-4" color={COLORS.primary} /> : null}
        />
      )}
    </SafeAreaView>
  )
}
