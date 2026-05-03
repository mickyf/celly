// Existing rows may have either a full Supabase public URL (legacy) or a bare
// storage path. Both forms point at the same object in `wine-images`.
// `extractPhotoPath` returns the path portion ({user_id}/{wine_id}.{ext}) we
// need to call createSignedUrl. Returns null for empty/unparseable input.
export function extractPhotoPath(stored: string | null | undefined): string | null {
  if (!stored) return null
  const trimmed = stored.trim()
  if (!trimmed) return null

  // Legacy public URL: ".../storage/v1/object/public/wine-images/{path}"
  // (or sign URL: ".../object/sign/wine-images/{path}?token=...")
  const match = trimmed.match(/\/wine-images\/([^?]+)/)
  if (match) return match[1]

  // Treat as already-stored path. Strip a leading slash if present.
  return trimmed.replace(/^\/+/, '')
}
