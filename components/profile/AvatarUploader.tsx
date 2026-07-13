'use client'

import { useRef, useState } from 'react'
import { CameraIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAvatarUploadUrl } from '@/app/uploads/actions'
import { updateAvatar } from '@/app/account/actions'
import { initials } from '@/components/profile/ProfileHeader'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB — matches the bucket limit
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function AvatarUploader({
  userId,
  displayName,
  initialUrl,
  avatarClassName,
}: {
  userId: string
  displayName: string
  initialUrl: string | null
  avatarClassName?: string
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
      const { slot, publicUrl, error } = await getAvatarUploadUrl({ contentType: file.type, sizeBytes: file.size })
      if (error || !slot || !publicUrl) throw new Error(error ?? 'Upload failed.')

      const put = await fetch(slot.url, { method: 'PUT', headers: slot.headers, body: file })
      if (!put.ok) throw new Error('Upload failed.')

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
        <Avatar className={cn('size-24 sm:size-28', avatarClassName)}>
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
