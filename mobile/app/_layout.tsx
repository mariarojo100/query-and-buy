/**
 * Root layout — providers (TanStack Query, Auth) + the navigation stack.
 */
import '../global.css'
import React, { useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthContext'
import { installInterTypography } from '@/theme/typography'

// Product decision: Query & Buy ships a single, deliberately art-directed light
// ("day") theme. `darkMode: 'class'` in tailwind.config.js means dark: variants
// only apply under a `dark` class that is never added, so the UI always renders
// light regardless of device appearance. (dark: classes remain in the source
// but never activate — kept only to avoid churn.)

// Install the Inter weight→family mapping before any Text renders.
installInterTypography()
void SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

/** Mirror the web's visibility-aware polling: intervals pause when backgrounded. */
function useAppStateFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active')
    })
    return () => sub.remove()
  }, [])
}

/**
 * Registers push tokens + routes notification taps. Native-only — on web the
 * gate is a no-op and the native push module is never required into the bundle.
 */
const PushGate: React.ComponentType =
  Platform.OS === 'web'
    ? () => null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/push/usePush') as typeof import('@/push/usePush')).PushGate

export default function RootLayout() {
  useAppStateFocus()
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })
  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync()
  }, [fontsLoaded])
  if (!fontsLoaded) return null
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PushGate />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[id]" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="(auth)/login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="(auth)/signup" options={{ presentation: 'modal' }} />
          <Stack.Screen name="sell/new" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="search" />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  )
}
