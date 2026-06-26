import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ProfileHero } from '@/components/account/ProfileHero'
import { AccountTabs } from '@/components/account/AccountTabs'
import { AvatarUploader } from '@/components/profile/AvatarUploader'
import { getSellerReputation } from '@/lib/reputation/queries'
import type { Profile } from '@/lib/profile/completion'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account')

  const { data } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, bio, emirate, badge_level, listings_count, member_since',
    )
    .eq('id', user.id)
    .maybeSingle()
  const profile = data as Profile | null

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
