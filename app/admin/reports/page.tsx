import { notFound, redirect } from 'next/navigation'
import { ShieldAlertIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/gate'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Card, CardContent } from '@/components/ui/card'
import { AdminReportRow, type AdminReport } from '@/components/admin/AdminReportRow'

export const metadata = { title: 'Reports · Admin · Query & Buy' }

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/admin/reports')
  // Simple gate: non-admins get a 404 (don't reveal the admin area exists).
  if (!isAdminEmail(user.email)) notFound()

  let reports: AdminReport[] = []
  let configError: string | null = null
  try {
    const admin = createServiceClient() // bypasses RLS to read all reports
    const { data, error } = await admin
      .from('reports')
      .select('id, reason, description, status, created_at, listing_id, reported_user_id')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) configError = error.message
    else reports = (data ?? []) as AdminReport[]
  } catch (e) {
    configError = e instanceof Error ? e.message : 'Admin not configured.'
  }

  const openCount = reports.filter((r) => r.status === 'open').length

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center gap-2">
          <ShieldAlertIcon className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          {reports.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {openCount} open · {reports.length} total
            </span>
          )}
        </div>

        {configError ? (
          <Card>
            <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
              <p>Could not load reports.</p>
              <pre className="rounded-md bg-muted px-3 py-2 font-mono text-xs">{configError}</pre>
              <p>
                Set <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in your environment
                so the admin view can read all reports.
              </p>
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No reports yet.
          </div>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {reports.map((r) => (
                <AdminReportRow key={r.id} report={r} />
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
