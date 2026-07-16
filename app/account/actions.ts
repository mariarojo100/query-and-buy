'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { updateProfileFor, updateAvatarFor, usernameAvailable } from '@/lib/db/profiles'
import { EMIRATE_VALUES } from '@/lib/profile/emirates'
import { USERNAME_RE, normalizeUsername } from '@/lib/profile/completion'
import { detectContactInfo, CONTACT_BLOCK_MESSAGE } from '@/lib/safety/contact'

export type ProfileFormState = { ok?: boolean; error?: string } | null

/** Update the signed-in user's profile (column-allowlisted in the repository). */
export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const display_name = String(formData.get('display_name') ?? '').trim()
  const username = normalizeUsername(String(formData.get('username') ?? ''))
  const bioRaw = String(formData.get('bio') ?? '').trim()
  const emirateRaw = String(formData.get('emirate') ?? '').trim()

  // --- validation ---
  if (display_name.length < 2 || display_name.length > 50) {
    return { error: 'Display name must be 2–50 characters.' }
  }
  if (!USERNAME_RE.test(username)) {
    return { error: 'Username must be 3–30 characters: lowercase letters, numbers, - or _.' }
  }
  if (bioRaw.length > 300) {
    return { error: 'Bio must be 300 characters or fewer.' }
  }
  if (emirateRaw && !EMIRATE_VALUES.includes(emirateRaw)) {
    return { error: 'Invalid emirate.' }
  }
  // Contact protection: no phone/email/links/social handles in bio or name.
  // Enforced server-side so a direct API/action call can't bypass the UI.
  if (detectContactInfo(bioRaw).blocked || detectContactInfo(display_name).blocked) {
    return { error: CONTACT_BLOCK_MESSAGE }
  }

  const res = await updateProfileFor(viewer, {
    displayName: display_name,
    username,
    bio: bioRaw || null,
    emirate: emirateRaw || null,
  })
  if (!res.ok) return { error: 'That username is already taken.' }

  revalidatePath('/account')
  revalidatePath(`/u/${username}`)
  return { ok: true }
}

/** Live username availability check for the edit form. */
export async function checkUsername(raw: string): Promise<{ available: boolean; reason?: string }> {
  const username = normalizeUsername(raw)
  if (!USERNAME_RE.test(username)) return { available: false, reason: 'invalid' }
  const viewer = await getViewer()
  const available = await usernameAvailable(username, viewer?.id ?? null)
  return available ? { available: true } : { available: false, reason: 'taken' }
}

/** Persist a newly-uploaded avatar URL. Called by the AvatarUploader. */
export async function updateAvatar(avatarUrl: string): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  await updateAvatarFor(viewer, avatarUrl)
  revalidatePath('/account')
  return { ok: true }
}
