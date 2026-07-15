/**
 * lib/notifications/push — Expo push delivery (fronts FCM + APNs).
 * ===========================================================================
 * Called fire-and-forget from dispatch(): looks up the recipient's registered
 * device tokens (push_tokens), chunks per the Expo API, and prunes tokens the
 * service reports as DeviceNotRegistered. Never throws.
 *
 * The payload carries data.url — an app route the mobile client opens on tap
 * (web /messages/:id links are translated to the app's /conversation/:id).
 */
import { Expo, type ExpoPushMessage } from 'expo-server-sdk'
import { pushTokensForUser, deletePushTokens } from '@/lib/db/pushTokens'
import { logger } from '@/lib/logger'

let client: Expo | undefined
function expo(): Expo {
  if (!client) client = new Expo()
  return client
}

/** Translate web notification links to mobile routes. */
export function toAppUrl(link: string | undefined): string {
  if (!link) return '/'
  const conv = link.match(/^\/messages\/([a-z0-9-]+)/i)
  if (conv) return `/conversation/${conv[1]}`
  const listing = link.match(/^\/listing\/([a-z0-9-]+)/i)
  if (listing) return `/listing/${listing[1]}`
  return '/'
}

export async function sendPush(input: {
  recipientId: string
  type: string
  title: string
  body?: string
  link?: string
}): Promise<void> {
  try {
    const tokens = (await pushTokensForUser(input.recipientId)).filter((t) => Expo.isExpoPushToken(t))
    if (tokens.length === 0) return

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      sound: 'default',
      title: input.title,
      body: input.body,
      data: { url: toAppUrl(input.link), type: input.type },
    }))

    const dead: string[] = []
    for (const chunk of expo().chunkPushNotifications(messages)) {
      const tickets = await expo().sendPushNotificationsAsync(chunk)
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const to = chunk[i]?.to
          if (typeof to === 'string') dead.push(to)
        }
      })
    }
    if (dead.length) await deletePushTokens(dead)
  } catch (e) {
    logger.warn('push.send', 'push delivery failed', {
      reason: e instanceof Error ? e.message : 'unknown',
    })
  }
}
