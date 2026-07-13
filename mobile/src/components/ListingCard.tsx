/**
 * ListingCard — the feed card (2-col grid): cover image, price, title,
 * emirate + relative time. Mirrors the web card's hierarchy.
 */
import React from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
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
      className="mb-3 flex-1 overflow-hidden rounded-qb border border-border bg-card dark:border-border-dark dark:bg-card-dark"
    >
      <View className="aspect-square w-full bg-border/40 dark:bg-border-dark/40">
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
        ) : null}
        {listing.is_featured ? (
          <View className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5">
            <Text className="text-[10px] font-bold uppercase text-white">Featured</Text>
          </View>
        ) : null}
      </View>
      <View className="p-3">
        <Text className="text-base font-bold text-primary dark:text-primary-light">
          {formatPrice(listing.price_fils, listing.currency)}
        </Text>
        <Text numberOfLines={2} className="mt-0.5 text-sm text-ink dark:text-ink-dark">
          {listing.title_en}
        </Text>
        <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
          {emirate}
          {emirate && listing.published_at ? ' · ' : ''}
          {timeAgo(listing.published_at)}
        </Text>
      </View>
    </ScalePressable>
  )
}
