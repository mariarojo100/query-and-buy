/**
 * ListingCard — the feed card (2-col grid): 4:3 cover with a considered
 * no-photo treatment, price-first hierarchy, quiet meta line.
 */
import React from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { formatPrice, EMIRATES } from '@qb/shared'
import type { FeedListingDto } from '@qb/shared'
import { listingImageUrl } from '@/lib/images'
import { ScalePressable } from '@/components/ui'

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
  const emirate = EMIRATES.find((e) => e.value === listing.emirate)?.label ?? ''
  const cover = listingImageUrl(listing.cover_key)

  return (
    <ScalePressable
      onPress={() => router.push(`/listing/${listing.id}`)}
      className="mb-3 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-card dark:border-border-dark dark:bg-card-dark"
    >
      <View style={{ aspectRatio: 4 / 3 }} className="w-full overflow-hidden bg-primary-light/50 dark:bg-border-dark/30">
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="image-outline" size={26} color="#0e5a4355" />
            <Text className="mt-1 text-[10px] font-medium text-primary/40 dark:text-muted-dark">No photo yet</Text>
          </View>
        )}
        {listing.is_featured ? (
          <View className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1">
            <Text className="text-[9px] font-bold uppercase tracking-wide text-white">Featured</Text>
          </View>
        ) : null}
      </View>
      <View className="px-3 pb-3 pt-2.5">
        <Text className="text-[15px] font-extrabold tracking-tight text-primary dark:text-primary-light">
          {formatPrice(listing.price_fils, listing.currency)}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-[13px] font-medium leading-snug text-ink dark:text-ink-dark">
          {listing.title_en}
        </Text>
        <View className="mt-1.5 flex-row items-center">
          <Ionicons name="location-outline" size={11} color="#8a8578" />
          <Text numberOfLines={1} className="ml-0.5 flex-1 text-[11px] text-muted dark:text-muted-dark">
            {emirate}
          </Text>
          <Text className="text-[11px] text-muted dark:text-muted-dark">{timeAgo(listing.published_at)}</Text>
        </View>
      </View>
    </ScalePressable>
  )
}
