/**
 * GoogleButton — "Continue with Google". When a platform Google client ID is
 * configured (EXPO_PUBLIC_GOOGLE_*), it runs the real OAuth flow and signs in
 * via AuthContext.googleLogin (POST /auth/google, like the website). When it is
 * not configured, it stays an honest placeholder that says so — never a button
 * that silently does nothing.
 *
 * The configured/placeholder split is a component-level branch on the build-time
 * constant `googleConfigured`, so the Google hook is never conditionally called.
 */
import React from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { googleConfigured, useGoogleAuth } from '@/auth/useGoogleAuth'

function ButtonShell({ onPress, busy }: { onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      className="h-[54px] flex-row items-center justify-center rounded-2xl border border-border bg-card active:opacity-90"
      style={{ opacity: busy ? 0.6 : 1 }}
    >
      {busy ? (
        <ActivityIndicator color="#DB4437" />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color="#DB4437" />
          <Text className="ml-2.5 text-[15px] font-semibold text-ink">Continue with Google</Text>
        </>
      )}
    </Pressable>
  )
}

function ConfiguredGoogleButton({ onSuccess, onError }: { onSuccess?: () => void; onError?: (m: string) => void }) {
  const { ready, signIn } = useGoogleAuth({ onSuccess, onError })
  return <ButtonShell onPress={() => void signIn()} busy={!ready} />
}

function PlaceholderGoogleButton() {
  return (
    <ButtonShell
      onPress={() => Alert.alert('Google sign-in', 'Google sign-in isn’t configured in this build yet.')}
    />
  )
}

export function GoogleButton(props: { onSuccess?: () => void; onError?: (m: string) => void }) {
  return (
    <View>
      {googleConfigured ? <ConfiguredGoogleButton {...props} /> : <PlaceholderGoogleButton />}
    </View>
  )
}
