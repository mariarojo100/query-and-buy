/**
 * AiPromoCard — home promo for the AI listing flow. Calm, useful, not gimmicky:
 * a short value line + primary CTA, with a small composed "smart document"
 * motif (checklist rows + restrained sparkles). Wires to the real sell flow.
 */
import React from 'react'
import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScalePressable } from '@/components/ui'
import { COLORS } from '@/theme/colors'

function DocMotif() {
  return (
    <View className="h-[72px] w-[68px] items-center justify-center">
      {/* sparkles */}
      <Ionicons name="sparkles" size={13} color={COLORS.accent} style={{ position: 'absolute', top: 2, right: 4 }} />
      <Ionicons name="sparkles" size={9} color={COLORS.accent} style={{ position: 'absolute', bottom: 6, left: 2 }} />
      {/* document */}
      <View className="rounded-xl bg-primary px-3 py-3" style={{ shadowColor: COLORS.primaryDark, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} className="mb-1.5 flex-row items-center">
            <View className="h-2.5 w-2.5 items-center justify-center rounded-full bg-white/90">
              <Ionicons name="checkmark" size={7} color={COLORS.primary} />
            </View>
            <View className="ml-1.5 h-1.5 rounded-full bg-white/70" style={{ width: i === 2 ? 16 : 24 }} />
          </View>
        ))}
      </View>
    </View>
  )
}

export function AiPromoCard({ onStart }: { onStart: () => void }) {
  return (
    <View className="mx-5 flex-row items-center rounded-card border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark">
      <View className="flex-1 pr-2">
        <Text className="text-[16px] font-bold tracking-tight text-ink dark:text-ink-dark">AI Listing in 2 minutes</Text>
        <Text className="mt-1 text-[12.5px] leading-[17px] text-muted dark:text-muted-dark">
          Snap, describe and post. Our AI does the rest.
        </Text>
        <ScalePressable
          onPress={onStart}
          accessibilityLabel="Try AI listing"
          className="mt-3.5 self-start rounded-full bg-primary px-4 py-2.5"
        >
          <Text className="text-[13px] font-semibold text-white">Try AI Listing</Text>
        </ScalePressable>
      </View>
      <DocMotif />
    </View>
  )
}
