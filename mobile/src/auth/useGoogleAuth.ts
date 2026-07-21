/**
 * useGoogleAuth — Google sign-in on device, exactly like the website's flow:
 * obtain a Google id_token, POST it to /api/v1/auth/google (AuthContext.googleLogin),
 * which verifies it against the backend's allowed client IDs and returns a session.
 *
 * Client IDs come from env (bundled at build time via EXPO_PUBLIC_*):
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 * Whichever platform IDs you ship MUST also be added (comma-separated) to the
 * server's GOOGLE_MOBILE_CLIENT_IDS so id_token audience verification passes.
 * See docs/google-oauth-setup.md.
 *
 * `googleConfigured` is false when the current platform's client ID is unset —
 * callers should render a disabled/placeholder button in that case (the hook is
 * safe to call regardless, but the flow can't start).
 */
import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { useAuth } from '@/auth/AuthContext'

WebBrowser.maybeCompleteAuthSession()

const CLIENT_IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
} as const

/** Whether the current platform has a Google client ID configured. */
export const googleConfigured = Boolean(
  Platform.select({
    ios: CLIENT_IDS.iosClientId,
    android: CLIENT_IDS.androidClientId,
    default: CLIENT_IDS.webClientId,
  }),
)

export function useGoogleAuth({ onSuccess, onError }: { onSuccess?: () => void; onError?: (message: string) => void }) {
  const { googleLogin } = useAuth()
  // Safe to call unconditionally: falls back to webClientId; the button is only
  // enabled when googleConfigured is true.
  const [request, response, promptAsync] = Google.useAuthRequest(CLIENT_IDS)

  useEffect(() => {
    if (!response) return
    if (response.type === 'success') {
      const idToken =
        response.authentication?.idToken ?? (response.params?.id_token as string | undefined)
      if (!idToken) {
        onError?.('Google didn’t return an ID token.')
        return
      }
      googleLogin(idToken)
        .then(() => onSuccess?.())
        .catch(() => onError?.('Could not sign in with Google. Please try again.'))
    } else if (response.type === 'error') {
      onError?.('Google sign-in failed. Please try again.')
    }
    // Ignore 'dismiss' / 'cancel' — the user backed out.
  }, [response]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ready: !!request, signIn: () => promptAsync() }
}
