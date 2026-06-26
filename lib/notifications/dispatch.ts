import { createServiceClient } from '@/utils/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { buildEmail, type EmailKind, type EmailData } from '@/lib/email/templates'

type PrefCategory = 'offer' | 'chat' | 'order' | 'review' | 'marketing'

/** Which preference category each email belongs to. */
const EMAIL_CATEGORY: Record<EmailKind, PrefCategory> = {
  offer_received: 'offer',
  counter_received: 'offer',
  offer_accepted: 'offer',
  buyer_confirmed: 'order',
  seller_confirmed: 'order',
  order_confirmed: 'order',
  contact_unlocked: 'order',
  reservation_cancelled: 'order',
  item_sold: 'order',
  listing_reserved: 'order',
  listing_reactivated: 'order',
  new_review: 'review',
}

/** Critical emails that always send regardless of preferences (account safety). */
const ALWAYS_SEND: ReadonlySet<EmailKind> = new Set([
  'order_confirmed',
  'contact_unlocked',
  'reservation_cancelled',
])

const PREF_COLUMN: Record<PrefCategory, string> = {
  offer: 'offer_emails',
  chat: 'chat_emails',
  order: 'order_emails',
  review: 'review_emails',
  marketing: 'marketing_emails',
}

/** Whether the recipient wants emails of this kind. Missing row → defaults. */
async function emailAllowed(
  admin: ReturnType<typeof createServiceClient>,
  recipientId: string,
  kind: EmailKind,
): Promise<boolean> {
  if (ALWAYS_SEND.has(kind)) return true
  const category = EMAIL_CATEGORY[kind]
  const { data } = await admin
    .from('notification_preferences')
    .select('offer_emails, chat_emails, order_emails, review_emails, marketing_emails')
    .eq('user_id', recipientId)
    .maybeSingle()
  if (!data) return category !== 'marketing' // default: everything but marketing
  return Boolean((data as Record<string, boolean>)[PREF_COLUMN[category]])
}

export type NotificationType =
  | 'new_message'
  | 'offer_received'
  | 'counter_received'
  | 'offer_accepted'
  | 'buyer_confirmed'
  | 'seller_confirmed'
  | 'order_confirmed'
  | 'contact_unlocked'
  | 'reservation_cancelled'
  | 'item_sold'
  | 'new_review'

export type DispatchInput = {
  recipientId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  data?: Record<string, unknown>
  /** When present, also send a branded email to the recipient's verified address. */
  email?: { kind: EmailKind; data: Omit<EmailData, 'recipientName'> }
}

/**
 * Create an in-app notification and (optionally) send a transactional email.
 * Best-effort and self-contained: never throws, so a transaction is never
 * blocked or failed by notification/email problems.
 */
export async function dispatch(input: DispatchInput): Promise<void> {
  let admin
  try {
    admin = createServiceClient()
  } catch {
    return // service role not configured → skip silently
  }

  // 1) in-app notification
  try {
    await admin.from('notifications').insert({
      user_id: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      data: (input.data ?? {}) as never,
    })
  } catch {
    /* ignore */
  }

  // 2) email — verified address (req 6) + respects the recipient's preferences
  if (input.email) {
    try {
      const allowed = await emailAllowed(admin, input.recipientId, input.email.kind)
      if (!allowed) return // preference off (and not a safety-critical email)

      const [{ data: prof }, { data: usr }] = await Promise.all([
        admin.from('profiles').select('display_name').eq('id', input.recipientId).maybeSingle(),
        admin
          .from('users')
          .select('email, has_email_verified')
          .eq('id', input.recipientId)
          .maybeSingle(),
      ])
      const email = (usr as { email?: string } | null)?.email
      const verified = !!(usr as { has_email_verified?: boolean } | null)?.has_email_verified
      if (email && verified) {
        const { subject, html } = buildEmail(input.email.kind, {
          ...input.email.data,
          recipientName: (prof as { display_name?: string } | null)?.display_name ?? 'there',
        })
        await sendEmail({
          to: email,
          subject,
          html,
          template: input.email.kind,
          payload: { recipientId: input.recipientId, type: input.type },
        })
      }
    } catch {
      /* ignore */
    }
  }
}

/** Dispatch the same email/notification to several recipients. */
export async function dispatchAll(inputs: DispatchInput[]): Promise<void> {
  await Promise.all(inputs.map((i) => dispatch(i)))
}
