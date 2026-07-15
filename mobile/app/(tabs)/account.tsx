/** Profile — avatar header + grouped settings. Signed-out shows a join hero. */
import React from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/AuthContext'
import { COLORS } from '@/theme/colors'

function MenuRow({
  icon,
  label,
  onPress,
  danger,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  danger?: boolean
  tint?: string
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-3.5 active:bg-primary-light/40 dark:active:bg-background-dark">
      <View className={`h-9 w-9 items-center justify-center rounded-full ${danger ? 'bg-danger/10' : 'bg-primary-light'}`}>
        <Ionicons name={icon} size={17} color={danger ? COLORS.danger : tint ?? COLORS.primary} />
      </View>
      <Text className={`ml-3 flex-1 text-[15px] font-medium ${danger ? 'text-danger' : 'text-ink dark:text-ink-dark'}`}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={COLORS.muted} />
    </Pressable>
  )
}

function Divider() {
  return <View className="ml-16 h-px bg-border dark:bg-border-dark" />
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      {title ? (
        <Text className="mb-2 px-6 text-[12px] font-bold uppercase tracking-wide text-muted dark:text-muted-dark">{title}</Text>
      ) : null}
      <View className="mx-5 overflow-hidden rounded-qb border border-border bg-card dark:border-border-dark dark:bg-card-dark">
        {children}
      </View>
    </View>
  )
}

export default function AccountScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()

  if (!user) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-light">
            <Ionicons name="person-outline" size={36} color={COLORS.primary} />
          </View>
          <Text className="mt-5 text-center text-[22px] font-extrabold tracking-tight text-ink dark:text-ink-dark">Join Query & Buy</Text>
          <Text className="mt-2 text-center text-[14px] leading-[20px] text-muted dark:text-muted-dark">
            Sign in to sell, chat with buyers and sellers, make offers, and save your favourites.
          </Text>
          <Pressable onPress={() => router.push('/(auth)/login')} className="mt-6 w-full items-center rounded-full bg-primary py-4 active:opacity-90">
            <Text className="text-[15px] font-bold text-white">Sign in</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/signup')} className="mt-3 w-full items-center rounded-full border border-border bg-card py-4 active:opacity-90 dark:border-border-dark dark:bg-card-dark">
            <Text className="text-[15px] font-bold text-primary dark:text-primary-light">Create an account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <View className="px-5 pt-4">
          <Text className="text-[26px] font-extrabold tracking-tight text-ink dark:text-ink-dark">Profile</Text>
          <View className="mt-4 flex-row items-center rounded-qb border border-border bg-card p-4 dark:border-border-dark dark:bg-card-dark">
            <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-light">
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text className="text-[22px] font-extrabold text-primary">{user.displayName.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View className="ml-4 flex-1">
              <Text numberOfLines={1} className="text-[18px] font-extrabold text-ink dark:text-ink-dark">{user.displayName}</Text>
              <Text numberOfLines={1} className="mt-0.5 text-[13px] text-muted dark:text-muted-dark">
                {user.username ? `@${user.username}` : user.email}
              </Text>
              {user.username ? (
                <Pressable onPress={() => router.push(`/user/${user.username}`)} hitSlop={6} className="mt-1.5 flex-row items-center">
                  <Text className="text-[12px] font-semibold text-primary dark:text-primary-light">View public profile</Text>
                  <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={() => router.push('/account/edit')}
              className="h-10 w-10 items-center justify-center rounded-full border border-border dark:border-border-dark"
              accessibilityLabel="Edit profile"
            >
              <Ionicons name="pencil" size={16} color={COLORS.primary} />
            </Pressable>
          </View>
        </View>

        {/* ── Selling ────────────────────────────────────────────── */}
        <Group title="Selling">
          <MenuRow icon="pricetags-outline" label="My listings" onPress={() => router.push('/account/listings' as never)} />
          <Divider />
          <MenuRow icon="add-circle-outline" label="Sell an item" onPress={() => router.push('/sell/new')} />
        </Group>

        {/* ── Activity ───────────────────────────────────────────── */}
        <Group title="Activity">
          <MenuRow icon="heart-outline" label="Saved items" onPress={() => router.push('/(tabs)/favorites' as never)} />
          <Divider />
          <MenuRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/account/notifications' as never)} />
        </Group>

        {/* ── Account ────────────────────────────────────────────── */}
        <Group title="Account">
          <MenuRow icon="person-outline" label="Edit profile" onPress={() => router.push('/account/edit')} />
          <Divider />
          <MenuRow
            icon="log-out-outline"
            label="Sign out"
            danger
            onPress={() =>
              Alert.alert('Sign out', 'Sign out of Query & Buy?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
              ])
            }
          />
        </Group>

        <Pressable onPress={() => router.push('/account/delete')} className="mt-6 items-center py-2">
          <Text className="text-[13px] text-muted dark:text-muted-dark">Delete account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
