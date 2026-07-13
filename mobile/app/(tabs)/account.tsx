/** Account — session card, sign in/out. Profile edit + settings expand in Phase 4/5. */
import React from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'

export default function AccountScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <Text className="px-5 pb-4 pt-3 text-2xl font-extrabold text-ink dark:text-ink-dark">Account</Text>

      {!user ? (
        <View className="mx-5 rounded-qb border border-border bg-card p-6 dark:border-border-dark dark:bg-card-dark">
          <Text className="text-lg font-semibold text-ink dark:text-ink-dark">Welcome to Query & Buy</Text>
          <Text className="mt-1 text-sm text-muted dark:text-muted-dark">Sign in to sell, chat, and save listings.</Text>
          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-4 items-center rounded-full bg-primary py-3 active:opacity-90">
            <Text className="font-semibold text-white">Sign in</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/signup')} className="mt-2 items-center py-2">
            <Text className="font-medium text-primary dark:text-primary-light">Create an account</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mx-5">
          <View className="flex-row items-center rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark">
            <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary-light">
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text className="text-lg font-bold text-primary">{user.displayName.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink dark:text-ink-dark">{user.displayName}</Text>
              <Text className="text-sm text-muted dark:text-muted-dark">{user.username ? `@${user.username}` : user.email}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/account/edit')}
            className="mt-4 flex-row items-center justify-between rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <Text className="font-medium text-ink dark:text-ink-dark">Edit profile</Text>
            <Ionicons name="chevron-forward" size={18} color="#8a8578" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/account/listings' as never)}
            className="mt-3 flex-row items-center justify-between rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <Text className="font-medium text-ink dark:text-ink-dark">My listings</Text>
            <Ionicons name="chevron-forward" size={18} color="#8a8578" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/account/notifications' as never)}
            className="mt-3 flex-row items-center justify-between rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <Text className="font-medium text-ink dark:text-ink-dark">Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color="#8a8578" />
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert('Sign out', 'Sign out of Query & Buy?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
              ])
            }
            className="mt-3 flex-row items-center justify-between rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark"
          >
            <Text className="font-medium text-danger">Sign out</Text>
            <Ionicons name="log-out-outline" size={20} color="#b3402a" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/account/delete')}
            className="mt-3 flex-row items-center justify-between p-4"
          >
            <Text className="text-sm text-muted dark:text-muted-dark">Delete account</Text>
            <Ionicons name="chevron-forward" size={16} color="#8a8578" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  )
}
