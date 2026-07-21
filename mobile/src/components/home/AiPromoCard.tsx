/**
 * AiPromoCard — home promo for the AI listing flow. Calm, useful, not gimmicky:
 * a short value line + an ink CTA, with a composed phone motif showing an
 * AI-generated listing (image + title lines + gold price) and restrained gold
 * sparkles. A phone mock rather than a stock photo, since it depicts the app
 * itself. Light theme only. Wires to the real sell flow.
 */
import React from 'react'
import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScalePressable } from '@/components/ui'
import { COLORS } from '@/theme/colors'

function AiMotif() {
  return (
    <View className="h-[88px] w-[82px] items-center justify-center">
      {/* sparkles */}
      <Ionicons name="sparkles" size={15} color={COLORS.accent} style={{ position: 'absolute', top: -2, right: 2, zIndex: 2 }} />
      <Ionicons name="sparkles" size={10} color={COLORS.accent} style={{ position: 'absolute', bottom: 2, left: -1, zIndex: 2 }} />
      <Ionicons name="star" size={7} color={COLORS.accent} style={{ position: 'absolute', top: 22, left: 4, zIndex: 2 }} />
      {/* phone */}
      <View
        style={{
          width: 58,
          height: 90,
          transform: [{ rotate: '7deg' }],
          backgroundColor: COLORS.ink,
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 5,
        }}
        className="rounded-[15px] p-[3px]"
      >
        {/* screen — a mini AI-generated listing */}
        <View className="h-full w-full overflow-hidden rounded-[12px] bg-card p-1.5">
          <View className="h-8 w-full rounded-md" style={{ backgroundColor: '#E7E1D3' }} />
          <View className="mt-1.5 h-1 w-3/4 rounded-full" style={{ backgroundColor: '#D9D3C5' }} />
          <View className="mt-1 h-1 w-1/2 rounded-full" style={{ backgroundColor: '#D9D3C5' }} />
          <View className="mt-1.5 h-1.5 w-2/5 rounded-full" style={{ backgroundColor: COLORS.accent }} />
        </View>
      </View>
    </View>
  )
}

export function AiPromoCard({ onStart }: { onStart: () => void }) {
  return (
    <View className="mx-5 flex-row items-center rounded-card border border-border bg-card p-4">
      <View className="flex-1 pr-2">
        <View className="flex-row items-center">
          <Text className="text-[16px] font-bold tracking-tight text-ink">AI Listing in 2 minutes</Text>
          <Ionicons name="sparkles" size={14} color={COLORS.accent} style={{ marginLeft: 6 }} />
        </View>
        <Text className="mt-1 text-[12.5px] leading-[17px] text-ink-soft">
          Snap, describe and post. Our AI does the rest.
        </Text>
        <ScalePressable
          onPress={onStart}
          accessibilityLabel="Try AI listing"
          accessibilityRole="button"
          className="mt-3.5 self-start rounded-full bg-ink px-4 py-2.5"
        >
          <Text className="text-[13px] font-semibold text-white">Try AI Listing</Text>
        </ScalePressable>
      </View>
      <AiMotif />
    </View>
  )
}
