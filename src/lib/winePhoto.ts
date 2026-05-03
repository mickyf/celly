// Accepts a legacy public URL or a bare storage path; returns the path.
export function extractPhotoPath(stored: string | null | undefined): string | null {
  if (!stored) return null
  const trimmed = stored.trim()
  if (!trimmed) return null

  const match = trimmed.match(/\/wine-images\/([^?]+)/)
  if (match) return match[1]

  return trimmed.replace(/^\/+/, '')
}
