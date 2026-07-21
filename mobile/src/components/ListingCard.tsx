/**
 * ListingCard — the marketplace card. Image-first (4:3, rounded) → title →
 * price → location · age + verified check. Real trust markers only: Featured
 * (listing flag), a "New" ribbon for very recent listings (derived from
 * published_at), and Verified seller (email-verified from the API). Heart is a
 * live favorite toggle for signed-in users. No-photo listings get an
 * intentional branded placeholder, never a broken-image feel.
 */
import React, { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { formatPrice, EMIRATES } from '@qb/shared'
import type { FeedListingDto } from '@qb/shared'
import { listingImageUrl } from '@/lib/images'
import { useToggleFavorite } from '@/queries'
import { useAuth } from '@/auth/AuthContext'
import { tick } from '@/lib/haptics'
import { COLORS } from '@/theme/colors'
import { ScalePressable } from '@/components/ui'

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${Math.max(min, 1)}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`
}

/** Recent = published within 48h → show the "New" ribbon. */
function isNew(iso: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 48 * 3600_000
}

export function ListingCard({ listing }: { listing: FeedListingDto }) {
  const router = useRouter()
  const { user } = useAuth()
  const toggle = useToggleFavorite()
  const [liked, setLiked] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const emirate = EMIRATES.find((e) => e.value === listing.emirate)?.label ?? ''
  const cover = listingImageUrl(listing.cover_key)
  const verifiedSeller = listing.seller?.email_verified === true
  const showNew = isNew(listing.published_at)

  const onHeart = () => {
    if (!user) {
      router.push('/(auth)/login')
      return
    }
    tick()
    setLiked((v) => !v)
    toggle.mutate(listing.id, { onError: () => setLiked((v) => !v) })
  }

  return (
    <ScalePressable onPress={() => router.push(`/listing/${listing.id}`)} className="mb-1 flex-1">
      {/* Image */}
      <View
        style={{ aspectRatio: 4 / 3 }}
        className="w-full overflow-hidden rounded-img border border-border bg-sunken dark:border-border-dark dark:bg-sunken-dark"
      >
        {cover && !imgFailed ? (
          <Image
            source={{ uri: cover }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={220}
            onError={() => setImgFailed(true)}
            accessibilityLabel={listing.title_en}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-card dark:bg-card-dark">
              <Ionicons name="image-outline" size={20} color={COLORS.muted} />
            </View>
            <Text className="mt-2 text-[10.5px] font-medium text-muted dark:text-muted-dark">
              {imgFailed ? 'Photo unavailable' : 'No photo yet'}
            </Text>
          </View>
        )}
        {/* ribbons */}
        <View className="absolute left-2.5 top-2.5 flex-row gap-1.5">
          {listing.is_featured ? (
            <View className="rounded-md bg-accent px-2 py-1">
              <Text className="text-[9px] font-extrabold uppercase tracking-wide text-white">Featured</Text>
            </View>
          ) : showNew ? (
            <View className="rounded-md bg-accent px-2 py-1">
              <Text className="text-[9px] font-extrabold uppercase tracking-wide text-white">New</Text>
            </View>
          ) : null}
        </View>
        {/* heart — frosted adaptive control */}
        <Pressable
          onPress={onHeart}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove from saved' : 'Save listing'}
          className="absolute right-2.5 top-2.5 h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-black/45"
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? COLORS.primary : COLORS.inkSoft} />
        </Pressable>
      </View>

      {/* Copy */}
      <View className="px-0.5 pt-2.5">
        <Text numberOfLines={1} className="text-[13.5px] font-semibold text-ink dark:text-ink-dark">
          {listing.title_en}
        </Text>
        <Text className="mt-1 text-[16px] font-extrabold tracking-tight text-ink dark:text-ink-dark">
          {formatPrice(listing.price_fils, listing.currency)}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Text numberOfLines={1} className="flex-shrink text-[11.5px] text-muted dark:text-muted-dark">
            {[emirate, listing.published_at ? timeAgo(listing.published_at) : ''].filter(Boolean).join('  ·  ')}
          </Text>
          {verifiedSeller ? (
            <Ionicons name="checkmark-circle" size={13} color={COLORS.accent} style={{ marginLeft: 5 }} />
          ) : null}
        </View>
      </View>
    </ScalePressable>
  )
}
