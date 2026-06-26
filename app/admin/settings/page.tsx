import { getSettings } from '@/lib/admin/queries'
import { AdminPageHeader } from '@/components/admin/ui'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const metadata = { title: 'Settings · Admin' }

export default async function AdminSettingsPage() {
  const settings = await getSettings()
  return (
    <>
      <AdminPageHeader title="Settings" subtitle="Marketplace configuration" />
      <SettingsForm initial={settings} />
    </>
  )
}
