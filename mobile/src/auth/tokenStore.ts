/**
 * src/auth/tokenStore — token pair persistence.
 * Native: the platform keychain (expo-secure-store) — never AsyncStorage,
 * these are credentials. Web: localStorage (no keychain exists in a browser;
 * this is what makes the web build hold a session for demos/testing).
 */
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const KEY = 'qb.session.v1'
const isWeb = Platform.OS === 'web'

export type StoredTokens = { accessToken: string; refreshToken: string }

export async function getTokens(): Promise<StoredTokens | null> {
  try {
    const raw = isWeb ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY)
    return raw ? (JSON.parse(raw) as StoredTokens) : null
  } catch {
    return null
  }
}

export async function setTokens(tokens: StoredTokens): Promise<void> {
  const raw = JSON.stringify(tokens)
  if (isWeb) globalThis.localStorage?.setItem(KEY, raw)
  else await SecureStore.setItemAsync(KEY, raw)
}

export async function clearTokens(): Promise<void> {
  if (isWeb) globalThis.localStorage?.removeItem(KEY)
  else await SecureStore.deleteItemAsync(KEY).catch(() => {})
}
