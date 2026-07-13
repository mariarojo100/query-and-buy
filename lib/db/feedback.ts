/**
 * lib/db/feedback — feedback insert (Phase 4). Replaces the feedback_insert RLS
 * (user_id IS NULL OR user_id = auth.uid()): the caller passes viewer?.id ?? null,
 * so a row is either anonymous or attributed to the acting user — never forged.
 */
import { db } from '@/lib/db'

export async function submitFeedbackRow(
  userId: string | null,
  input: { kind: string; message: string; path: string | null; userAgent: string | null },
): Promise<void> {
  await db.feedback.create({
    data: {
      userId,
      kind: input.kind,
      message: input.message,
      path: input.path,
      userAgent: input.userAgent,
    },
  })
}
