import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth/session'
import { profileById } from '@/lib/db/profiles'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ProfileHero } from '@/components/account/ProfileHero'
import { AccountTabs } from '@/components/account/AccountTabs'
import { AvatarUploader } from '@/components/profile/AvatarUploader'
import { getSellerReputation } from '@/lib/reputation/queries'
import type { Profile } from '@/lib/profile/completion'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getViewer()
  if (!user) redirect('/login?redirectTo=/account')

  const profile = (await profileById(user.id)) as
    | (Profile & { email_verified: boolean; phone_verified: boolean })
    | null

  if (!profile) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">{children}</main>
      </>
    )
  }

  const rep = await getSellerReputation(profile.id, { withResponse: true })

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <ProfileHero
          profile={profile}
          rep={rep}
          verified={profile.email_verified && profile.phone_verified}
          avatarSlot={
            <AvatarUploader
              userId={profile.id}
              displayName={profile.display_name}
              initialUrl={profile.avatar_url}
              avatarClassName="ring-4 ring-card"
            />
          }
        />
        <Suspense>
          <AccountTabs />
        </Suspense>
        <main className="pt-6">{children}</main>
      </div>
    </>
  )
}
