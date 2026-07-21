/**
 * AiPromoCard — home promo for the AI listing flow. Calm, useful, not gimmicky:
 * a short value line + an ink CTA, with a small composed "smart listing" motif
 * (an ink card with checklist rows + restrained gold sparkles). Light theme
 * only. Wires to the real sell flow.
 */
import React from 'react'
import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScalePressable } from '@/components/ui'
import { COLORS } from '@/theme/colors'

function AiMotif() {
  return (
    <View className="h-[76px] w-[72px] items-center justify-center">
      <Ionicons name="sparkles" size={14} color={COLORS.accent} style={{ position: 'absolute', top: 0, right: 2 }} />
      <Ionicons name="sparkles" size={9} color={COLORS.accent} style={{ position: 'absolute', bottom: 4, left: 0 }} />
      <View
        className="rounded-2xl bg-ink px-3 py-3"
        style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} className="mb-1.5 flex-row items-center">
            <View className="h-2.5 w-2.5 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.accent }}>
              <Ionicons name="checkmark" size={7} color={COLORS.ink} />
            </View>
            <View className="ml-1.5 h-1.5 rounded-full bg-white/35" style={{ width: i === 2 ? 16 : 24 }} />
          </View>
        ))}
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
