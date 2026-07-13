/**
 * Listing detail — gallery pager, price/title block, seller card, similar
 * items, favorite toggle (optimistic), and the message-seller CTA
 * (chat wiring lands in Phase 4).
 */
import React from 'react'
import { Alert, Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { formatPrice, CONDITIONS, EMIRATES } from '@qb/shared'
import { useListing, useToggleFavorite } from '@/queries'
import { openConversation } from '@/queries/messaging'
import { reportContent } from '@/lib/moderation'
import { useAuth } from '@/auth/AuthContext'
import { listingImageUrl } from '@/lib/images'
import { ListingCard } from '@/components/ListingCard'
import { ErrorState, Skeleton } from '@/components/ui'

const W = Dimensions.get('window').width

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const q = useListing(id)
  const toggle = useToggleFavorite()

  if (q.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
        <Skeleton className="h-80 w-full rounded-none" />
        <View className="p-5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-3 h-5 w-64" />
          <Skeleton className="mt-6 h-20 w-full" />
        </View>
      </SafeAreaView>
    )
  }
  if (q.isError || !q.data) {
    return <ErrorState message="This listing isn't available." onRetry={() => void q.refetch()} />
  }

  const { listing, similar, isFavorited } = q.data
  const images = [...listing.images].sort((a, b) => a.position - b.position)
  const emirate = EMIRATES.find((e) => e.value === listing.emirate)?.label
  const condition = CONDITIONS.find((c) => c.value === listing.condition)?.label

  const onMessage = async () => {
    if (!user) {
      router.push('/(auth)/login')
      return
    }
    try {
      const { conversationId } = await openConversation(listing.id)
      router.push(`/conversation/${conversationId}`)
    } catch (e) {
      Alert.alert('Not possible', e instanceof Error ? e.message : 'Try again.')
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        {/* Gallery */}
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {(images.length ? images : [{ storage_key: null as string | null, position: 0 }]).map((img, i) => (
              <View key={i} style={{ width: W, height: W * 0.9 }} className="bg-border/40 dark:bg-border-dark/40">
                {img.storage_key ? (
                  <Image source={{ uri: listingImageUrl(img.storage_key)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                ) : null}
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={() => router.back()} className="absolute left-4 top-3 h-10 w-10 items-center justify-center rounded-full bg-black/40">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => (user ? toggle.mutate(listing.id) : router.push('/(auth)/login'))}
            className="absolute right-4 top-3 h-10 w-10 items-center justify-center rounded-full bg-black/40"
          >
            <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={22} color={isFavorited ? '#e2574c' : '#fff'} />
          </Pressable>
          <Pressable
            onPress={() => (user ? reportContent({ listingId: listing.id }) : router.push('/(auth)/login'))}
            className="absolute right-4 top-16 h-10 w-10 items-center justify-center rounded-full bg-black/40"
          >
            <Ionicons name="flag-outline" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Price + title */}
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-extrabold text-primary dark:text-primary-light">
              {formatPrice(listing.price_fils, listing.currency)}
            </Text>
            {listing.is_negotiable ? (
              <View className="rounded-full bg-primary-light px-3 py-1">
                <Text className="text-xs font-semibold text-primary">Negotiable</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1.5 text-lg font-semibold leading-snug text-ink dark:text-ink-dark">{listing.title_en}</Text>
          <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
            {[condition, emirate, listing.area].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* Description */}
        <View className="mx-5 mt-4 rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark">
          <Text className="text-sm leading-relaxed text-ink dark:text-ink-dark">{listing.description}</Text>
        </View>

        {/* Seller */}
        {listing.seller ? (
          <Pressable
            onPress={() => listing.seller?.username && router.push(`/user/${listing.seller.username}`)}
            className="mx-5 mt-4 flex-row items-center rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-light">
              {listing.seller.avatar_url ? (
                <Image source={{ uri: listing.seller.avatar_url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text className="font-bold text-primary">{listing.seller.display_name.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-ink dark:text-ink-dark">{listing.seller.display_name}</Text>
              <Text className="text-xs capitalize text-muted dark:text-muted-dark">{listing.seller.badge_level} seller</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8a8578" />
          </Pressable>
        ) : null}

        {/* Similar */}
        {similar.length > 0 && (
          <View className="mt-6 pb-8">
            <Text className="px-5 text-lg font-bold text-ink dark:text-ink-dark">Similar items</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 12 }}>
              {similar.map((l) => (
                <View key={l.id} style={{ width: 170 }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* CTA bar */}
      <View className="border-t border-border bg-card px-5 pb-2 pt-3 dark:border-border-dark dark:bg-card-dark">
        <Pressable onPress={() => void onMessage()} className="items-center rounded-full bg-primary py-3.5 active:opacity-90">
          <Text className="text-base font-semibold text-white">Message seller</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
