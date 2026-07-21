'use client'

import { useActionState, useEffect, useState } from 'react'
import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateProfile, checkUsername } from '@/app/account/actions'
import { EMIRATES } from '@/lib/profile/emirates'
import { USERNAME_RE, normalizeUsername, type Profile } from '@/lib/profile/completion'
import { detectContactInfo, BIO_CONTACT_HELPER } from '@/lib/safety/contact'

const BIO_MAX = 300
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState(updateProfile, null)

  const initialUsername = profile.username ?? ''
  const [username, setUsername] = useState(initialUsername)
  const [status, setStatus] = useState<UsernameStatus>('idle')
  const [emirate, setEmirate] = useState(profile.emirate ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')

  // Deterministic contact-info check (same util the server enforces). Cheap,
  // synchronous — safe to run on every keystroke; no AI / network.
  const bioContact = detectContactInfo(bio)

  // Toast on save result.
  useEffect(() => {
    if (state?.ok) toast.success('Profile saved.')
    else if (state?.error) toast.error(state.error)
  }, [state])

  // Debounced username availability check (only when changed from current handle).
  useEffect(() => {
    const normalized = normalizeUsername(username)
    if (normalized === initialUsername) {
      setStatus('idle')
      return
    }
    if (!USERNAME_RE.test(normalized)) {
      setStatus('invalid')
      return
    }
    setStatus('checking')
    const t = setTimeout(async () => {
      const res = await checkUsername(normalized)
      setStatus(res.available ? 'available' : res.reason === 'invalid' ? 'invalid' : 'taken')
    }, 400)
    return () => clearTimeout(t)
  }, [username, initialUsername])

  const blockSubmit =
    isPending ||
    status === 'checking' ||
    status === 'taken' ||
    status === 'invalid' ||
    bioContact.blocked

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name}
          required
          minLength={2}
          maxLength={50}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            @
          </span>
          <Input
            id="username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pl-7 pr-9"
            required
            autoCapitalize="none"
            spellCheck={false}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {status === 'checking' && (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            )}
            {status === 'available' && <CheckIcon className="size-4 text-success" />}
            {(status === 'taken' || status === 'invalid') && (
              <XIcon className="size-4 text-destructive" />
            )}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {status === 'taken'
            ? 'That username is taken.'
            : status === 'invalid'
              ? '3–30 characters: lowercase letters, numbers, - or _.'
              : status === 'available'
                ? 'Available — this will be your public URL.'
                : 'Your public profile lives at /u/your-username.'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emirate">Location</Label>
        <Select value={emirate || undefined} onValueChange={setEmirate}>
          <SelectTrigger id="emirate" className="w-full">
            <SelectValue placeholder="Select your emirate" />
          </SelectTrigger>
          <SelectContent>
            {EMIRATES.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="emirate" value={emirate} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">Bio</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {bio.length}/{BIO_MAX}
          </span>
        </div>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell buyers a little about yourself…"
          aria-invalid={bioContact.blocked}
          aria-describedby="bio-help"
          className={bioContact.blocked ? 'border-destructive focus-visible:ring-destructive/30' : undefined}
        />
        {bioContact.blocked ? (
          <p id="bio-help" className="text-xs text-destructive">
            Please remove {bioContact.reasons.join(', ')}. Contact details and links become
            available automatically after an order is confirmed.
          </p>
        ) : (
          <p id="bio-help" className="text-xs text-muted-foreground">
            {BIO_CONTACT_HELPER}
          </p>
        )}
      </div>

      <Button type="submit" disabled={blockSubmit} className="w-full sm:w-auto">
        {isPending && <Loader2Icon className="size-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  )
}
