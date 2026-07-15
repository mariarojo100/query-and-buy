/**
 * Listing detail — the conversion screen.
 * Immersive gallery (paged, counter + dots) → price/title → key-details grid →
 * description → trust-forward seller card → similar items → sticky safe-area
 * CTA (Save + Message). Every action is live; nothing decorative.
 */
import React, { useState } from 'react'
import { Alert, Dimensions, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { formatPrice, CONDITIONS, EMIRATES } from '@qb/shared'
import { useListing, useToggleFavorite } from '@/queries'
import { openConversation } from '@/queries/messaging'
import { reportContent } from '@/lib/moderation'
import { tick } from '@/lib/haptics'
import { useAuth } from '@/auth/AuthContext'
import { listingImageUrl } from '@/lib/images'
import { ListingCard } from '@/components/ListingCard'
import { COLORS } from '@/theme/colors'
import { ErrorState, Skeleton } from '@/components/ui'

const W = Dimensions.get('window').width
const GALLERY_H = Math.round(W * 0.86)

function timeAgo(iso: string | null): string {
  if (!iso) return 'Just now'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${Math.max(min, 1)} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`
}

/** One key-detail cell in the specs grid. */
function DetailCell({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="w-1/2 flex-row items-center py-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <View className="ml-2.5 flex-1">
        <Text className="text-[11px] text-muted dark:text-muted-dark">{label}</Text>
        <Text numberOfLines={1} className="text-[13px] font-semibold text-ink dark:text-ink-dark">{value}</Text>
      </View>
    </View>
  )
}

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const q = useListing(id)
  const toggle = useToggleFavorite()
  const [page, setPage] = useState(0)

  if (q.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
        <Skeleton className="h-[300px] w-full rounded-none" />
        <View className="p-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-3 h-5 w-64" />
          <Skeleton className="mt-6 h-24 w-full rounded-img" />
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
  const tier = listing.seller?.badge_level?.toLowerCase()
  const verified = !!tier && !['new', 'none', 'member'].includes(tier)
  const views = listing.view_count ?? 0

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / W)
    if (p !== page) setPage(p)
  }

  const onSave = () => {
    if (!user) return router.push('/(auth)/login')
    tick()
    toggle.mutate(listing.id)
  }
  const onMessage = async () => {
    if (!user) return router.push('/(auth)/login')
    try {
      const { conversationId } = await openConversation(listing.id)
      router.push(`/conversation/${conversationId}`)
    } catch (e) {
      Alert.alert('Not possible', e instanceof Error ? e.message : 'Try again.')
    }
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* ── Gallery ─────────────────────────────────────────────── */}
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
            {(images.length ? images : [{ storage_key: null as string | null, position: 0 }]).map((img, i) => (
              <View key={i} style={{ width: W, height: GALLERY_H }} className="bg-sunken dark:bg-sunken-dark">
                {img.storage_key ? (
                  <Image source={{ uri: listingImageUrl(img.storage_key)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={180} />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <View className="h-16 w-16 items-center justify-center rounded-3xl bg-card dark:bg-card-dark">
                      <Ionicons name="image-outline" size={30} color={COLORS.muted} />
                    </View>
                    <Text className="mt-2.5 text-[12px] font-medium text-muted dark:text-muted-dark">No photos yet</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* image counter */}
          {images.length > 1 ? (
            <View className="absolute bottom-3 right-4 flex-row items-center rounded-full bg-black/55 px-2.5 py-1">
              <Ionicons name="images-outline" size={11} color="#fff" />
              <Text className="ml-1 text-[11px] font-semibold text-white">{page + 1}/{images.length}</Text>
            </View>
          ) : null}
          {/* dots */}
          {images.length > 1 ? (
            <View className="absolute bottom-3.5 left-0 right-0 flex-row justify-center gap-1.5">
              {images.map((_, i) => (
                <View key={i} className={`h-1.5 rounded-full ${i === page ? 'w-4 bg-white' : 'w-1.5 bg-white/55'}`} />
              ))}
            </View>
          ) : null}

          {/* floating controls */}
          <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
            <View className="flex-row items-center justify-between px-4 pt-2">
              <Pressable onPress={() => router.back()} accessibilityLabel="Back" className="h-10 w-10 items-center justify-center rounded-full bg-black/45">
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => (user ? reportContent({ listingId: listing.id }) : router.push('/(auth)/login'))}
                  accessibilityLabel="Report listing"
                  className="h-10 w-10 items-center justify-center rounded-full bg-black/45"
                >
                  <Ionicons name="flag-outline" size={17} color="#fff" />
                </Pressable>
                <Pressable onPress={onSave} accessibilityLabel={isFavorited ? 'Remove from saved' : 'Save listing'} className="h-10 w-10 items-center justify-center rounded-full bg-black/45">
                  <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? '#FF6B6B' : '#fff'} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ── Price + title ───────────────────────────────────────── */}
        <View className="px-6 pt-5">
          <View className="flex-row items-center">
            <Text className="flex-1 text-[28px] font-extrabold tracking-tight text-ink dark:text-ink-dark">
              {formatPrice(listing.price_fils, listing.currency)}
            </Text>
            {listing.is_negotiable ? (
              <View className="rounded-full bg-primary-light px-3 py-1.5 dark:bg-primary/15">
                <Text className="text-[11px] font-bold text-primary dark:text-primary-light">Negotiable</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-2 text-[18px] font-bold leading-[24px] text-ink dark:text-ink-dark">{listing.title_en}</Text>
          <View className="mt-2 flex-row items-center">
            <Ionicons name="location-outline" size={13} color={COLORS.muted} />
            <Text className="ml-1 text-[13px] text-muted dark:text-muted-dark">
              {[emirate, listing.area].filter(Boolean).join(', ') || 'UAE'} · {timeAgo(listing.published_at)}
            </Text>
          </View>
        </View>

        {/* ── Key details grid ────────────────────────────────────── */}
        <View className="mx-6 mt-4 flex-row flex-wrap rounded-qb border border-border bg-card px-4 dark:border-border-dark dark:bg-card-dark">
          {condition ? <DetailCell icon="ribbon-outline" label="Condition" value={condition} /> : null}
          {emirate ? <DetailCell icon="location-outline" label="Location" value={emirate} /> : null}
          <DetailCell icon="eye-outline" label="Views" value={views === 1 ? '1 view' : `${views} views`} />
          <DetailCell icon="time-outline" label="Posted" value={timeAgo(listing.published_at)} />
        </View>

        {/* ── Description ──────────────────────────────────────────── */}
        <View className="px-6 pt-6">
          <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">Description</Text>
          <Text className="mt-2 text-[14px] leading-[21px] text-ink/90 dark:text-ink-dark">{listing.description}</Text>
        </View>

        {/* ── Seller ──────────────────────────────────────────────── */}
        {listing.seller ? (
          <Pressable
            onPress={() => listing.seller?.username && router.push(`/user/${listing.seller.username}`)}
            className="mx-6 mt-6 flex-row items-center rounded-qb border border-border bg-card p-4 active:opacity-95 dark:border-border-dark dark:bg-card-dark"
          >
            <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-light dark:bg-primary/15">
              {listing.seller.avatar_url ? (
                <Image source={{ uri: listing.seller.avatar_url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text className="text-[16px] font-bold text-primary dark:text-primary-light">{listing.seller.display_name.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{listing.seller.display_name}</Text>
                {verified ? <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} style={{ marginLeft: 5 }} /> : null}
              </View>
              <Text className="mt-0.5 text-[12px] text-muted dark:text-muted-dark">
                {verified ? `${tier![0].toUpperCase()}${tier!.slice(1)} seller · ` : ''}View profile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </Pressable>
        ) : null}

        {/* ── Similar ─────────────────────────────────────────────── */}
        {similar.length > 0 && (
          <View className="mt-8">
            <Text className="px-6 text-[17px] font-bold tracking-tight text-ink dark:text-ink-dark">Similar items</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, gap: 14 }}>
              {similar.map((l) => (
                <View key={l.id} style={{ width: 176 }}>
                  <ListingCard listing={l} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky CTA (safe-area aware) ──────────────────────────── */}
      <View
        className="flex-row items-center gap-3 border-t border-border bg-card px-5 pt-3 dark:border-border-dark dark:bg-card-dark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={onSave}
          accessibilityLabel={isFavorited ? 'Saved' : 'Save'}
          className="h-13 w-14 items-center justify-center rounded-full border border-border dark:border-border-dark"
          style={{ height: 52 }}
        >
          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={23} color={isFavorited ? '#FF6B6B' : COLORS.ink} />
        </Pressable>
        <Pressable
          onPress={() => void onMessage()}
          className="flex-1 flex-row items-center justify-center rounded-full bg-primary active:opacity-90"
          style={{ height: 52 }}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text className="ml-2 text-[16px] font-bold text-white">Message seller</Text>
        </Pressable>
      </View>
    </View>
  )
}
