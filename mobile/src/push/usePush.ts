/**
 * src/push/usePush — device registration + notification tap routing.
 * ===========================================================================
 * On login/foreground: get the Expo push token and register it with the API.
 * On logout: unregister. Taps (foreground, background, and cold start) route
 * to the payload's data.url (/conversation/:id, /listing/:id).
 */
import { useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { api } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null
  const { status } = await Notifications.getPermissionsAsync()
  let granted = status === 'granted'
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync()
    granted = req.status === 'granted'
  }
  if (!granted) return null
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}

export function usePush(): void {
  const { user } = useAuth()
  const router = useRouter()
  const registered = useRef<string | null>(null)

  // Register on login + app foreground; unregister on logout.
  useEffect(() => {
    if (!user) {
      if (registered.current) {
        void api('/push-tokens', { method: 'DELETE', body: { token: registered.current } }).catch(() => {})
        registered.current = null
      }
      return
    }
    const register = async () => {
      try {
        const token = await getPushToken()
        if (!token || registered.current === token) return
        await api('/push-tokens', { body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } })
        registered.current = token
      } catch {
        /* push is optional */
      }
    }
    void register()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void register()
    })
    return () => sub.remove()
  }, [user])

  // Tap routing (incl. cold start).
  useEffect(() => {
    const route = (resp: Notifications.NotificationResponse | null) => {
      const url = resp?.notification.request.content.data?.url
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as never)
    }
    void Notifications.getLastNotificationResponseAsync().then(route)
    const sub = Notifications.addNotificationResponseReceivedListener(route)
    return () => sub.remove()
  }, [router])
}
