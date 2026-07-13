/** Chats — inbox. Conversation list + thread land in Phase 4 (API is live). */
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/auth/AuthContext'
import { EmptyState } from '@/components/ui'

export default function InboxScreen() {
  const router = useRouter()
  const { user } = useAuth()

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <Text className="px-5 pb-2 pt-3 text-2xl font-extrabold text-ink dark:text-ink-dark">Chats</Text>
      {!user ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center text-lg font-semibold text-ink dark:text-ink-dark">Message buyers & sellers</Text>
          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-5 rounded-full bg-primary px-8 py-3 active:opacity-90">
            <Text className="font-semibold text-white">Sign in</Text>
          </Pressable>
        </View>
      ) : (
        <EmptyState title="Chat arrives in the next build" body="The messaging API is live — the inbox UI ships in Phase 4." />
      )}
    </SafeAreaView>
  )
}
