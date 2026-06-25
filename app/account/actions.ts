'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { USERNAME_RE, normalizeUsername } from '@/lib/profile/completion'

export type ProfileFormState = { ok?: boolean; error?: string } | null

/** Update the signed-in user's profile. RLS enforces id = auth.uid(). */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const display_name = String(formData.get('display_name') ?? '').trim()
  const username = normalizeUsername(String(formData.get('username') ?? ''))
  const bioRaw = String(formData.get('bio') ?? '').trim()
  const emirateRaw = String(formData.get('emirate') ?? '').trim()

  // --- validation ---
  if (display_name.length < 2 || display_name.length > 50) {
    return { error: 'Display name must be 2–50 characters.' }
  }
  if (!USERNAME_RE.test(username)) {
    return {
      error: 'Username must be 3–30 characters: lowercase letters, numbers, - or _.',
    }
  }
  if (bioRaw.length > 300) {
    return { error: 'Bio must be 300 characters or fewer.' }
  }
  if (emirateRaw && !EMIRATE_VALUES.includes(emirateRaw)) {
    return { error: 'Invalid emirate.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name,
      username,
      bio: bioRaw || null,
      emirate: emirateRaw || null,
    })
    .eq('id', user.id)

  if (error) {
    // 23505 = unique_violation (username already taken)
    if (error.code === '23505') return { error: 'That username is already taken.' }
    return { error: error.message }
  }

  revalidatePath('/account')
  revalidatePath(`/u/${username}`)
  return { ok: true }
}

/** Live username availability check for the edit form. */
export async function checkUsername(
  raw: string,
): Promise<{ available: boolean; reason?: string }> {
  const username = normalizeUsername(raw)
  if (!USERNAME_RE.test(username)) {
    return { available: false, reason: 'invalid' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (error) return { available: false, reason: 'error' }
  // Free if nobody has it, or it's the current user's own handle.
  if (!data || (user && data.id === user.id)) return { available: true }
  return { available: false, reason: 'taken' }
}

/** Persist a newly-uploaded avatar URL. Called by the AvatarUploader. */
export async function updateAvatar(
  avatarUrl: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account')
  return { ok: true }
}
