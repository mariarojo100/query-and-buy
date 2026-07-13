/**
 * Root layout — providers (TanStack Query, Auth) + the navigation stack.
 */
import '../global.css'
import React, { useEffect } from 'react'
import { AppState } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthContext'
import { usePush } from '@/push/usePush'

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

/** Runs inside the providers: registers push tokens + routes notification taps. */
function PushGate() {
  usePush()
  return null
}

export default function RootLayout() {
  useAppStateFocus()
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PushGate />
        <StatusBar style="auto" />
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
