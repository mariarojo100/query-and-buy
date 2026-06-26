'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/gate'

const ALLOWED_STATUSES = ['open', 'reviewed', 'closed']

/** Update a report's status. Re-checks the admin gate (server actions are public). */
export async function updateReportStatus(
  id: string,
  status: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { error: 'Not authorized.' }
  if (!ALLOWED_STATUSES.includes(status)) return { error: 'Invalid status.' }

  let admin
  try {
    admin = createServiceClient()
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Admin not configured.' }
  }

  const { error } = await admin.from('reports').update({ status }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/reports')
  return { ok: true }
}
