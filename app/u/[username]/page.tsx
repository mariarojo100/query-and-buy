import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PackageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import type { Profile } from '@/lib/profile/completion'

const PROFILE_COLUMNS =
  'id, username, display_name, avatar_url, bio, emirate, badge_level, listings_count, member_since'

async function getProfile(username: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', username)
    .maybeSingle()
  return data as Profile | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) return { title: 'Profile not found · Query & Buy' }
  return {
    title: `${profile.display_name} (@${profile.username}) · Query & Buy`,
    description: profile.bio ?? `${profile.display_name} on Query & Buy`,
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Card>
        <CardContent className="space-y-5 pt-6">
          <ProfileHeader profile={profile} />
          {profile.bio && (
            <>
              <Separator />
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {profile.bio}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <PackageIcon className="size-8 opacity-40" />
            <p className="text-sm">
              {profile.listings_count > 0
                ? `${profile.listings_count} listings`
                : 'No listings yet'}
            </p>
            <p className="text-xs">Listings will appear here soon.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
