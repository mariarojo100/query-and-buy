/**
 * HeroBanner — the home marketing carousel. Warm greige card, editorial ink
 * headline, an ink call-to-action with a gold arrow, and a paged set of value
 * props with a working dot indicator. The right-hand motif is a warm stand-in
 * for a lifestyle photo (swap in real marketing art later). Light theme only.
 */
import React, { useRef, useState } from 'react'
import { Dimensions, ScrollView, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScalePressable } from '@/components/ui'
import { COLORS } from '@/theme/colors'

type Slide = { title: string; sub: string; cta: string; onPress: () => void; icon: keyof typeof Ionicons.glyphMap }

const GUTTER = 20 // mirrors mx-5

function HeroSlide({ slide, width }: { slide: Slide; width: number }) {
  return (
    <View style={{ width }} className="flex-row overflow-hidden rounded-card" >
      <View className="flex-1 py-5 pl-5 pr-2" style={{ maxWidth: '62%' }}>
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

      {/* Warm lifestyle motif (stand-in) */}
      <View className="flex-1 items-center justify-center">
        <View className="absolute h-32 w-32 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} />
        <View
          className="items-center justify-center rounded-2xl"
          style={{ width: 78, height: 92, backgroundColor: '#FFFFFF', shadowColor: '#7A6A45', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 }}
        >
          <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: COLORS.accentLight }}>
            <Ionicons name={slide.icon} size={22} color={COLORS.accentDeep} />
          </View>
          <View className="mt-2 h-1.5 w-11 rounded-full" style={{ backgroundColor: '#E7E1D3' }} />
          <View className="mt-1 h-1.5 w-7 rounded-full" style={{ backgroundColor: '#E7E1D3' }} />
        </View>
      </View>
    </View>
  )
}

export function HeroBanner({ onList, onExplore }: { onList: () => void; onExplore: () => void }) {
  const width = Dimensions.get('window').width - GUTTER * 2
  const [index, setIndex] = useState(0)
  const ref = useRef<ScrollView>(null)

  const slides: Slide[] = [
    { title: 'Premium finds.\nGreat prices.\nNear you.', sub: 'Buy and sell trusted items across the UAE.', cta: 'List your item', onPress: onList, icon: 'bag-handle' },
    { title: 'Sell in\nminutes.', sub: 'Snap a photo — our AI writes the listing for you.', cta: 'Start selling', onPress: onList, icon: 'camera' },
    { title: 'Buy with\nconfidence.', sub: 'Verified sellers across all seven emirates.', cta: 'Explore now', onPress: onExplore, icon: 'shield-checkmark' },
  ]

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    if (i !== index) setIndex(i)
  }

  return (
    <View
      className="mx-5 overflow-hidden rounded-card"
      style={{ backgroundColor: '#ECE7DB', shadowColor: '#7A6A45', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}
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
