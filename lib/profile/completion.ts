/** Shared shape of a profile row used across the profile UI. */
export type Profile = {
  id: string
  username: string | null
  display_name: string
  avatar_url: string | null
  bio: string | null
  emirate: string | null
  badge_level: string
  listings_count: number
  member_since: string
}

export type CompletionItem = { key: string; label: string; done: boolean }

export type Completion = {
  percent: number
  items: CompletionItem[]
  remaining: CompletionItem[]
}

/**
 * Pure profile-completion calculator. Counts the fields a user can fill in;
 * drives the progress meter and the "what's next" checklist on the dashboard.
 */
export function profileCompletion(p: Profile): Completion {
  const items: CompletionItem[] = [
    {
      key: 'display_name',
      label: 'Add your name',
      done: !!p.display_name && p.display_name.trim() !== '' && p.display_name !== 'New User',
    },
    { key: 'username', label: 'Choose a username', done: !!p.username },
    { key: 'avatar', label: 'Upload a profile photo', done: !!p.avatar_url },
    { key: 'bio', label: 'Write a short bio', done: !!p.bio && p.bio.trim().length > 0 },
    { key: 'emirate', label: 'Set your location', done: !!p.emirate },
  ]

  const doneCount = items.filter((i) => i.done).length
  const percent = Math.round((doneCount / items.length) * 100)

  return { percent, items, remaining: items.filter((i) => !i.done) }
}

/** Username rules shared by client validation and the server action. */
export const USERNAME_RE = /^[a-z0-9_-]{3,30}$/

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}
