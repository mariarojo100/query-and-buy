/**
 * ListingCard — the marketplace card. Image-first (4:3, rounded), price →
 * two-line title → condition · location · age. Real trust markers only:
 * Featured (listing flag) and Verified seller (email-verified from the API).
 * Heart is a live favorite toggle for signed-in users. No-photo listings get
 * an intentional branded placeholder, never a broken-image feel.
 */
import React, { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { formatPrice, EMIRATES, CONDITIONS } from '@qb/shared'
import type { FeedListingDto } from '@qb/shared'
import { listingImageUrl } from '@/lib/images'
import { useToggleFavorite } from '@/queries'
import { useAuth } from '@/auth/AuthContext'
import { tick } from '@/lib/haptics'
import { COLORS } from '@/theme/colors'
import { Badge, ScalePressable } from '@/components/ui'

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `${Math.max(min, 1)}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  return d < 7 ? `${d}d` : `${Math.floor(d / 7)}w`
}

export function ListingCard({ listing }: { listing: FeedListingDto }) {
  const router = useRouter()
  const { user } = useAuth()
  const toggle = useToggleFavorite()
  const [liked, setLiked] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const emirate = EMIRATES.find((e) => e.value === listing.emirate)?.label ?? ''
  const condition = CONDITIONS.find((c) => c.value === listing.condition)?.label
  const cover = listingImageUrl(listing.cover_key)
  const verifiedSeller = listing.seller?.email_verified === true

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
    <ScalePressable onPress={() => router.push(`/listing/${listing.id}`)} className="mb-4 flex-1">
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
        {/* badges */}
        <View className="absolute left-2 top-2 flex-row gap-1.5">
          {listing.is_featured ? <Badge label="Featured" tone="featured" /> : null}
        </View>
        {/* heart — frosted control, 34pt touch target */}
        <Pressable
          onPress={onHeart}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove from saved' : 'Save listing'}
          className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-black/35"
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FF6B6B' : '#fff'} />
        </Pressable>
      </View>

      {/* Copy */}
      <View className="px-0.5 pt-2.5">
        <View className="flex-row items-center">
          <Text className="flex-1 text-[17px] font-extrabold tracking-tight text-ink dark:text-ink-dark">
            {formatPrice(listing.price_fils, listing.currency)}
          </Text>
          {verifiedSeller ? (
            <View className="flex-row items-center rounded-full bg-primary-light px-1.5 py-0.5 dark:bg-primary/15">
              <Ionicons name="shield-checkmark" size={10} color={COLORS.primary} />
              <Text className="ml-0.5 text-[9.5px] font-bold text-primary dark:text-primary-light">Verified</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={2} className="mt-1 text-[13.5px] font-medium leading-[18px] text-ink dark:text-ink-dark">
          {listing.title_en}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-[11.5px] text-muted dark:text-muted-dark">
          {[condition, emirate].filter(Boolean).join('  ·  ')}
          {listing.published_at ? `  ·  ${timeAgo(listing.published_at)}` : ''}
        </Text>
      </View>
    </ScalePressable>
  )
}
