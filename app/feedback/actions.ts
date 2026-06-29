'use server'

import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

const KINDS = ['bug', 'feature', 'general']

/** Submit beta feedback. Works signed-in or anonymous; never throws to the UI. */
export async function submitFeedback(input: {
  kind: string
  message: string
  path?: string
  userAgent?: string
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const message = input.message.trim()
  if (!message) return { error: 'Please enter a message.' }
  if (message.length > 2000) return { error: 'Message is too long (max 2000 characters).' }
  if (!KINDS.includes(input.kind)) return { error: 'Pick a feedback type.' }

  const { error } = await supabase.from('feedback').insert({
    user_id: user?.id ?? null,
    kind: input.kind,
    message,
    path: input.path?.slice(0, 200) ?? null,
    user_agent: input.userAgent?.slice(0, 300) ?? null,
  })
  if (error) {
    logger.error('feedback.submit', 'insert failed', { code: error.code })
    return { error: 'Could not submit feedback. Please try again.' }
  }
  return { ok: true }
}
