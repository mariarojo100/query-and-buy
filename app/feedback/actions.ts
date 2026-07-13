'use server'

import { getViewer } from '@/lib/auth/session'
import { submitFeedbackRow } from '@/lib/db/feedback'
import { logger } from '@/lib/logger'

const KINDS = ['bug', 'feature', 'general']

/** Submit beta feedback. Works signed-in or anonymous; never throws to the UI. */
export async function submitFeedback(input: {
  kind: string
  message: string
  path?: string
  userAgent?: string
}): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer()

  const message = input.message.trim()
  if (!message) return { error: 'Please enter a message.' }
  if (message.length > 2000) return { error: 'Message is too long (max 2000 characters).' }
  if (!KINDS.includes(input.kind)) return { error: 'Pick a feedback type.' }

  try {
    await submitFeedbackRow(viewer?.id ?? null, {
      kind: input.kind,
      message,
      path: input.path?.slice(0, 200) ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    })
  } catch {
    logger.error('feedback.submit', 'insert failed', {})
    return { error: 'Could not submit feedback. Please try again.' }
  }
  return { ok: true }
}
