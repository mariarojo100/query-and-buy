import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookmarkIcon, ExternalLinkIcon, HeartIcon, PackageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileCompletion } from '@/components/profile/ProfileCompletion'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { AvatarUploader } from '@/components/profile/AvatarUploader'
import type { Profile } from '@/lib/profile/completion'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, bio, emirate, badge_level, listings_count, member_since',
    )
    .eq('id', user.id)
    .single()
  const profile = data as Profile | null

  // Profile/username column missing → migrations not deployed yet.
  if (error || !profile) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">My account</h1>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>
              Your profile couldn&apos;t be loaded. Deploy the latest database
              migrations so the profile (and <code>username</code> column) exist:
            </p>
            <pre className="rounded-md bg-muted px-3 py-2 font-mono text-xs">
              npm run db:push
            </pre>
          </CardContent>
        </Card>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My account</h1>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ProfileHeader
            profile={profile}
            avatarSlot={
              <AvatarUploader
                userId={profile.id}
                displayName={profile.display_name}
                initialUrl={profile.avatar_url}
              />
            }
          />
          <Separator className="my-5" />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/account/listings">
                <PackageIcon className="size-4" />
                My listings
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/favorites">
                <HeartIcon className="size-4" />
                Favorites
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/saved-searches">
                <BookmarkIcon className="size-4" />
                Saved searches
              </Link>
            </Button>
            {profile.username && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/u/${profile.username}`}>
                  <ExternalLinkIcon className="size-4" />
                  View public profile
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ProfileCompletion profile={profile} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm profile={profile} />
        </CardContent>
      </Card>
    </main>
  )
}
