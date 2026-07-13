/**
 * src/lib/haptics — tasteful, centralized haptic feedback.
 * Native-only (no-ops on web); failures are swallowed — haptics are garnish.
 */
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

const on = Platform.OS !== 'web'

/** Light tick — favorites, chip selects, toggles. */
export function tick(): void {
  if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

/** Success — published a listing, offer accepted, deal confirmed. */
export function success(): void {
  if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

/** Warning — blocked content, failed action worth feeling. */
export function warn(): void {
  if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
}
