import Link from 'next/link'
import { getViewer } from '@/lib/auth/session'
import { profileById } from '@/lib/db/profiles'
import { getVerificationState } from '@/lib/db/auth'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { VerificationSection } from '@/components/account/VerificationSection'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { getMyPreferences } from '@/lib/notifications/preferences'
import type { Profile } from '@/lib/profile/completion'

export const metadata = { title: 'Settings · Query & Buy' }

export default async function AccountSettingsPage() {
  const user = await getViewer()
  if (!user) return null

  const profile = (await profileById(user.id)) as Profile | null
  if (!profile) return null

  const verification = await getVerificationState(user.id)
  const prefs = await getMyPreferences()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight">Settings</h2>
        <div className="flex items-center gap-2">
          {profile.username && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/u/${profile.username}`}>View public profile</Link>
            </Button>
          )}
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg font-normal">Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm profile={profile} />
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg font-normal">Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationSection
            email={verification?.email ?? user.email}
            emailVerified={verification?.emailVerified ?? false}
            phoneE164={verification?.phoneE164 ?? null}
            phoneVerified={verification?.phoneVerified ?? false}
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-lg font-normal">Email notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPreferences initial={prefs} />
        </CardContent>
      </Card>
    </div>
  )
}
