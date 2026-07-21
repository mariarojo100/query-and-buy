/**
 * HeroBanner — the home marketing card. Soft emerald gradient (mint in light,
 * deep green in dark), an editorial headline, a supporting line and the primary
 * "List your item" call-to-action. The right-hand motif is a lightweight
 * decorative composition (a floating "listing" tile on soft rings) — a premium
 * stand-in for a lifestyle photo, swappable for a real marketing asset later.
 */
import React from 'react'
import { Text, View, useColorScheme } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { ScalePressable } from '@/components/ui'
import { COLORS } from '@/theme/colors'

export function HeroBanner({ onList }: { onList: () => void }) {
  const dark = useColorScheme() === 'dark'
  const gradient = dark ? (['#123A2B', '#0D2A20'] as const) : (['#E8F2EB', '#D6E9DD'] as const)
  const headline = dark ? COLORS.inkDark : COLORS.primaryDark
  const sub = dark ? 'rgba(238,241,234,0.72)' : '#4A5A50'

  return (
    <View
      className="mx-5 overflow-hidden rounded-card"
      style={{ shadowColor: COLORS.primaryDark, shadowOpacity: dark ? 0 : 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View className="flex-row">
          {/* Copy */}
          <View className="flex-1 py-5 pl-5 pr-2" style={{ maxWidth: '64%' }}>
            <Text style={{ color: headline }} className="text-[21px] font-extrabold leading-[26px] tracking-tight">
              Premium finds.{'\n'}Great prices.{'\n'}Near you.
            </Text>
            <Text style={{ color: sub }} className="mt-2 text-[12.5px] leading-[17px]">
              Buy and sell trusted items across the UAE.
            </Text>
            <ScalePressable
              onPress={onList}
              accessibilityLabel="List your item"
              className="mt-4 flex-row items-center self-start rounded-full bg-primary py-2.5 pl-4 pr-2.5"
            >
              <Text className="text-[13px] font-semibold text-white">List your item</Text>
              <View className="ml-2 h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Ionicons name="arrow-forward" size={13} color="#fff" />
              </View>
            </ScalePressable>
          </View>

          {/* Decorative motif */}
          <View className="flex-1 items-center justify-center">
            <View
              className="absolute h-32 w-32 rounded-full"
              style={{ backgroundColor: dark ? 'rgba(63,169,138,0.12)' : 'rgba(255,255,255,0.45)' }}
            />
            <View
              className="absolute h-20 w-20 rounded-full"
              style={{ backgroundColor: dark ? 'rgba(63,169,138,0.16)' : 'rgba(255,255,255,0.6)' }}
            />
            <View
              className="items-center justify-center rounded-2xl bg-card dark:bg-elevated-dark"
              style={{ width: 74, height: 88, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-light dark:bg-primary/20">
                <Ionicons name="bag-handle" size={20} color={COLORS.primary} />
              </View>
              <View className="mt-2 h-1.5 w-10 rounded-full bg-border dark:bg-border-dark" />
              <View className="mt-1 h-1.5 w-7 rounded-full bg-border dark:bg-border-dark" />
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  )
}
