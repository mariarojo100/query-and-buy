/**
 * Delete account — App Store / Play Store requirement. Double confirmation,
 * then POST /me/delete (server soft-deletes + anonymizes + revokes every
 * session) and local logout.
 */
import React, { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { COLORS } from '@/theme/colors'

export default function DeleteAccountScreen() {
  const router = useRouter()
  const { logout } = useAuth()
  const [busy, setBusy] = useState(false)

  const confirm = () => {
    Alert.alert(
      'Delete your account?',
      'This is permanent. Your profile is removed, your listings are taken down, and you will be signed out everywhere.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () => {
            setBusy(true)
            void api('/me/delete', { method: 'POST' })
              .then(async () => {
                await logout()
                router.dismissAll()
                router.replace('/(tabs)')
              })
              .catch((e) =>
                Alert.alert('Could not delete', e instanceof ApiError ? e.message : 'Try again.'),
              )
              .finally(() => setBusy(false))
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row items-center px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-ink dark:text-ink-dark">Delete account</Text>
      </View>
      <View className="flex-1 px-6 pt-6">
        <View className="rounded-qb border border-danger/30 bg-danger/5 p-5">
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">This cannot be undone</Text>
          <Text className="mt-2 text-sm leading-relaxed text-muted dark:text-muted-dark">
            Deleting your account permanently removes your profile and personal data, takes your
            listings off the marketplace, and signs you out of every device. Conversations and
            completed transactions with other users are anonymized, not exposed.
          </Text>
        </View>
        <Pressable
          onPress={confirm}
          disabled={busy}
          className={`mt-6 items-center rounded-full bg-danger py-3.5 ${busy ? 'opacity-60' : 'active:opacity-90'}`}
        >
          <Text className="text-base font-semibold text-white">{busy ? 'Deleting…' : 'Delete my account'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
