/** Saved — the favorites grid (auth-gated with a sign-in prompt). */
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useFavorites } from '@/queries'
import { useAuth } from '@/auth/AuthContext'
import { ListingCard } from '@/components/ListingCard'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui'
import type { FeedListingDto } from '@qb/shared'

export default function FavoritesScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const q = useFavorites(!!user)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <Text className="px-5 pb-2 pt-3 text-2xl font-extrabold text-ink dark:text-ink-dark">Saved</Text>
      {!user ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center text-lg font-semibold text-ink dark:text-ink-dark">Keep track of what you love</Text>
          <Text className="mt-2 text-center text-sm text-muted dark:text-muted-dark">Sign in to save listings and find them here.</Text>
          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-5 rounded-full bg-primary px-8 py-3 active:opacity-90">
            <Text className="font-semibold text-white">Sign in</Text>
          </Pressable>
        </View>
      ) : q.isError ? (
        <ErrorState message="Couldn't load your saved items." onRetry={() => void q.refetch()} />
      ) : q.isLoading ? (
        <CardGridSkeleton />
      ) : (q.data?.listings.length ?? 0) === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Nothing saved yet"
          body="Tap the heart on any listing to keep it here."
          action="Browse listings"
          onAction={() => router.push('/(tabs)/explore' as never)}
        />
      ) : (
        <FlashList
          data={q.data?.listings ?? []}
          numColumns={2}
          keyExtractor={(item: FeedListingDto) => item.id}
          renderItem={({ item }: { item: FeedListingDto }) => (
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <ListingCard listing={item} />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
        />
      )}
    </SafeAreaView>
  )
}
