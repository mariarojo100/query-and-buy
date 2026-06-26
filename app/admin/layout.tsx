import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/admin/gate'
import { AdminShell } from '@/components/admin/AdminShell'

export const metadata = { title: 'Admin · Query & Buy' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const adminName = (data as { display_name?: string } | null)?.display_name ?? user.email ?? 'Admin'

  return <AdminShell adminName={adminName}>{children}</AdminShell>
}
