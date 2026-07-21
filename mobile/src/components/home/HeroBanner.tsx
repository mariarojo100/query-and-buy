/**
 * HeroBanner — the home marketing carousel. Warm greige card, editorial ink
 * headline, an ink CTA with a gold arrow, and a paged set of value props with a
 * working dot indicator. A warm lifestyle photo sits on the right of each slide,
 * blended into the card so the left-hand copy stays on a solid, legible ground.
 * Light theme only.
 *
 * The hero photo is a remote stock image (Unsplash, free licence) for now —
 * bundle it into assets/ + require() for offline production use.
 */
import React, { useRef, useState } from 'react'
import { Dimensions, ScrollView, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { ScalePressable } from '@/components/ui'
import { COLORS } from '@/theme/colors'

const CARD = '#ECE7DB'
const HERO_A = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'
const HERO_B = 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80'

type Slide = { title: string; sub: string; cta: string; onPress: () => void; image: string }

const GUTTER = 20 // mirrors mx-5

function HeroSlide({ slide, width }: { slide: Slide; width: number }) {
  return (
    <View style={{ width, height: 202 }}>
      {/* Lifestyle photo on the right, blended into the card */}
      <View className="absolute bottom-0 right-0 top-0 overflow-hidden" style={{ width: '55%' }}>
        <Image source={{ uri: slide.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
        <LinearGradient
          colors={[CARD, 'rgba(236,231,219,0.15)', 'rgba(236,231,219,0)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Copy */}
      <View className="py-5 pl-5 pr-2" style={{ maxWidth: '62%' }}>
        <Text className="text-[21px] font-extrabold leading-[26px] tracking-tight text-ink">{slide.title}</Text>
        <Text className="mt-2 text-[12.5px] leading-[17px] text-ink-soft">{slide.sub}</Text>
        <ScalePressable
          onPress={slide.onPress}
          accessibilityLabel={slide.cta}
          accessibilityRole="button"
          className="mt-4 flex-row items-center self-start rounded-full bg-ink py-2.5 pl-4 pr-2.5"
        >
          <Text className="text-[13px] font-semibold text-white">{slide.cta}</Text>
          <View className="ml-2 h-6 w-6 items-center justify-center rounded-full bg-accent">
            <Ionicons name="arrow-forward" size={13} color={COLORS.ink} />
          </View>
        </ScalePressable>
      </View>
    </View>
  )
}

export function HeroBanner({ onList, onExplore }: { onList: () => void; onExplore: () => void }) {
  const width = Dimensions.get('window').width - GUTTER * 2
  const [index, setIndex] = useState(0)
  const ref = useRef<ScrollView>(null)

  const slides: Slide[] = [
    { title: 'Premium finds.\nGreat prices.\nNear you.', sub: 'Buy and sell trusted items across the UAE.', cta: 'List your item', onPress: onList, image: HERO_B },
    { title: 'Sell in\nminutes.', sub: 'Snap a photo — our AI writes the listing for you.', cta: 'Start selling', onPress: onList, image: HERO_A },
    { title: 'Buy with\nconfidence.', sub: 'Verified sellers across all seven emirates.', cta: 'Explore now', onPress: onExplore, image: HERO_B },
  ]

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    if (i !== index) setIndex(i)
  }

  return (
    <View
      className="mx-5 overflow-hidden rounded-card"
      style={{ backgroundColor: CARD, shadowColor: '#7A6A45', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}
    >
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((s) => (
          <HeroSlide key={s.title} slide={s} width={width} />
        ))}
      </ScrollView>
      {/* dots */}
      <View className="absolute bottom-3.5 left-5 flex-row gap-1.5">
        {slides.map((s, i) => (
          <View
            key={s.title}
            style={{ height: 6, width: i === index ? 16 : 6, backgroundColor: i === index ? COLORS.accent : 'rgba(122,106,69,0.28)' }}
            className="rounded-full"
          />
        ))}
      </View>
    </View>
  )
}
