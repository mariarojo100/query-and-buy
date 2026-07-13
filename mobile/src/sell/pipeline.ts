/**
 * src/sell/pipeline — the sell flow's image + AI plumbing.
 * ===========================================================================
 * pick → compress (1600px upload copy + 768px AI copy) → presign → parallel
 * PUTs → AI draft. Mirrors the web flow: the server owns validation, rate
 * limits, and the 70% confidence gate; this module only moves bytes.
 */
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { File } from 'expo-file-system'
import { api } from '@/api/client'

export type PickedPhoto = {
  /** Local uri of the compressed 1600px upload copy. */
  uri: string
  /** Base64 of the 768px AI copy. */
  aiBase64: string
  width: number
  height: number
}

const MAX_PHOTOS = 8

/** Open the system picker (multi-select) and produce compressed copies. */
export async function pickPhotos(existing: number): Promise<PickedPhoto[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_PHOTOS - existing,
    quality: 1,
  })
  if (res.canceled) return []

  const out: PickedPhoto[] = []
  for (const asset of res.assets.slice(0, MAX_PHOTOS - existing)) {
    const upload = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.min(asset.width ?? 1600, 1600) } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    )
    const ai = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 768 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    )
    out.push({
      uri: upload.uri,
      aiBase64: ai.base64 ?? '',
      width: upload.width,
      height: upload.height,
    })
  }
  return out
}

type PresignedSlot = { url: string; key: string; headers: Record<string, string> }

/** Presign + upload all photos in parallel. Returns storage keys in order. */
export async function uploadPhotos(
  photos: PickedPhoto[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ storage_key: string; position: number; width: number; height: number }[]> {
  const { slots } = await api<{ slots: PresignedSlot[] }>('/uploads/listing-images', {
    body: { files: photos.map((p) => ({ contentType: 'image/jpeg', sizeBytes: fileSize(p.uri) })) },
  })

  let done = 0
  await Promise.all(
    slots.map(async (slot, i) => {
      const file = new File(photos[i].uri)
      const res = await fetch(slot.url, {
        method: 'PUT',
        headers: { 'content-type': 'image/jpeg', ...slot.headers },
        body: await file.arrayBuffer(),
      })
      if (!res.ok) throw new Error(`Upload failed (${res.status}).`)
      done += 1
      onProgress?.(done, slots.length)
    }),
  )

  return slots.map((slot, i) => ({
    storage_key: slot.key,
    position: i,
    width: photos[i].width,
    height: photos[i].height,
  }))
}

function fileSize(uri: string): number {
  try {
    const f = new File(uri)
    return f.size ?? 500_000
  } catch {
    return 500_000
  }
}

export type AiDraft = {
  title: string
  description: string
  categoryId: string | null
  condition: string | null
  detected: { label: string; value: string; confidence: number }[]
  lowConfidence: string[]
  pricing: {
    quickSaleAed: number | null
    fairMarketAed: number | null
    premiumAed: number | null
    confidence: number
    reasoning: string | null
  } | null
  overallConfidence: number
  warning: string | null
}

/** Ask the server AI for a draft (uses the 768px copies; max 5). */
export function generateDraft(photos: PickedPhoto[]): Promise<{ draft: AiDraft }> {
  return api<{ draft: AiDraft }>('/ai/listing-draft', {
    body: {
      images: photos.slice(0, 5).map((p) => ({ mimeType: 'image/jpeg', dataBase64: p.aiBase64 })),
    },
  })
}
