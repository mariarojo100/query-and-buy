/**
 * src/lib/moderation — report + block actions (App Store UGC requirements).
 * Uses the native Alert as a lightweight reason picker.
 */
import { Alert } from 'react-native'
import { api } from '@/api/client'

const REASONS = [
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'fake', label: 'Fake listing' },
  { value: 'prohibited', label: 'Prohibited item' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
] as const

export function reportContent(target: { listingId?: string; reportedUserId?: string }): void {
  Alert.alert('Report', 'Why are you reporting this?', [
    ...REASONS.map((r) => ({
      text: r.label,
      onPress: () => {
        void api('/reports', { body: { ...target, reason: r.value } })
          .then(() => Alert.alert('Thank you', 'Our team will review this report.'))
          .catch((e) => Alert.alert('Could not report', e instanceof Error ? e.message : 'Try again.'))
      },
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ])
}

export function blockUser(userId: string, displayName: string, onBlocked: () => void): void {
  Alert.alert(
    `Block ${displayName}?`,
    'They won’t be able to message you, and your conversations with them will be hidden.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          void api(`/users/${userId}/block`, { method: 'POST' })
            .then(onBlocked)
            .catch((e) => Alert.alert('Could not block', e instanceof Error ? e.message : 'Try again.'))
        },
      },
    ],
  )
}
