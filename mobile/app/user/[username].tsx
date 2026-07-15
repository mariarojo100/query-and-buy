/** Public seller profile — card + active listings (reviews display: Phase 4). */
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { ListingCard } from '@/components/ListingCard'
import { COLORS } from '@/theme/colors'
import { ErrorState, Skeleton } from '@/components/ui'
import type { FeedListingDto } from '@qb/shared'

type ProfileResponse = {
  profile: { id: string; display_name: string; username: string | null; avatar_url: string | null; bio: string | null; badge_level: string; member_since: string }
  listings: FeedListingDto[]
  reviewStats: { average: number | null; count: number }
}

export default function UserScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const router = useRouter()
  const q = useQuery({
    queryKey: ['user', username],
    queryFn: () => api<ProfileResponse>(`/users/${username}`, { anonymous: true }),
    enabled: !!username,
  })

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row items-center px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
        </Pressable>
      </View>
      {q.isLoading ? (
        <View className="px-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="mt-4 h-40 w-full" />
        </View>
      ) : q.isError || !q.data ? (
        <ErrorState message="Profile not found." />
      ) : (
        <FlashList
          data={q.data.listings}
          numColumns={2}
          keyExtractor={(item: FeedListingDto) => item.id}
          renderItem={({ item }: { item: FeedListingDto }) => (
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <ListingCard listing={item} />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
          ListHeaderComponent={
            <View className="mb-4 mt-1 flex-row items-center rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark">
              <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary-light">
                {q.data.profile.avatar_url ? (
                  <Image source={{ uri: q.data.profile.avatar_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text className="text-lg font-bold text-primary">{q.data.profile.display_name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-ink dark:text-ink-dark">{q.data.profile.display_name}</Text>
                <Text className="text-xs text-muted dark:text-muted-dark">
                  {q.data.reviewStats.count > 0
                    ? `★ ${q.data.reviewStats.average?.toFixed(1)} · ${q.data.reviewStats.count} reviews`
                    : 'No reviews yet'}
                </Text>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
