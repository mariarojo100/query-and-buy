'use client'

import { useRef, useState } from 'react'
import { CameraIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { updateAvatar } from '@/app/account/actions'
import { initials } from '@/components/profile/ProfileHeader'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB — matches the bucket limit
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function AvatarUploader({
  userId,
  displayName,
  initialUrl,
}: {
  userId: string
  displayName: string
  initialUrl: string | null
}) {
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return

    if (!ALLOWED.includes(file.type)) {
      toast.error('Please choose a PNG, JPEG, WebP, or GIF image.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 2 MB or smaller.')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)

      const res = await updateAvatar(publicUrl)
      if (res.error) throw new Error(res.error)

      setUrl(publicUrl)
      toast.success('Profile photo updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="size-24 sm:size-28">
          <AvatarImage src={url ?? undefined} alt={displayName} />
          <AvatarFallback className="text-2xl">{initials(displayName)}</AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2Icon className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(',')}
        className="hidden"
        onChange={onFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <CameraIcon className="size-4" />
        {url ? 'Change photo' : 'Upload photo'}
      </Button>
    </div>
  )
}
