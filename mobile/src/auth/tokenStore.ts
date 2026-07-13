/**
 * src/auth/tokenStore — token pair persistence in the platform keychain
 * (expo-secure-store). Never AsyncStorage: these are credentials.
 */
import * as SecureStore from 'expo-secure-store'

const KEY = 'qb.session.v1'

export type StoredTokens = { accessToken: string; refreshToken: string }

export async function getTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    return raw ? (JSON.parse(raw) as StoredTokens) : null
  } catch {
    return null
  }
}

export async function setTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens))
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY).catch(() => {})
}
