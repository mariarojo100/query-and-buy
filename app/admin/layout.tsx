import { requireAdmin } from '@/lib/admin/gate'
import { profileHeader } from '@/lib/db/profiles'
import { AdminShell } from '@/components/admin/AdminShell'

export const metadata = { title: 'Admin · Query & Buy' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()
  const data = await profileHeader(user.id)
  const adminName = data?.display_name ?? user.email ?? 'Admin'

  return <AdminShell adminName={adminName}>{children}</AdminShell>
}
