/**
 * Client-only: downscale an image File to a compact base64 JPEG before sending
 * it to a server action (keeps payloads small + uniform for the vision model).
 * Runs in the browser (uses canvas / createImageBitmap).
 */
export async function fileToAiImage(
  file: File,
  maxDim = 1024,
  quality = 0.7,
): Promise<{ mimeType: string; dataBase64: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not supported in this browser.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { mimeType: 'image/jpeg', dataBase64: dataUrl.split(',')[1] ?? '' }
}
