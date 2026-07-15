/** Sell — entry point. The camera → AI draft → publish flow lands in Phase 3. */
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { COLORS } from '@/theme/colors'

export default function SellScreen() {
  const router = useRouter()
  const { user } = useAuth()

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
          <Ionicons name="camera-outline" size={36} color={COLORS.primary} />
        </View>
        <Text className="mt-5 text-center text-2xl font-extrabold text-ink dark:text-ink-dark">Snap. Sell. Done.</Text>
        <Text className="mt-2 text-center text-sm leading-relaxed text-muted dark:text-muted-dark">
          Add a few photos and AI drafts your listing — title, description, and a price suggestion.
        </Text>
        {!user ? (
          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-6 rounded-full bg-primary px-8 py-3.5 active:opacity-90">
            <Text className="text-base font-semibold text-white">Sign in to sell</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/sell/new')} className="mt-6 rounded-full bg-primary px-8 py-3.5 active:opacity-90">
            <Text className="text-base font-semibold text-white">Start with photos</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}
