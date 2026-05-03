import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { extractPhotoPath } from '../lib/winePhoto'

// Signed URL TTL. The query staleTime is set just under this so we refresh
// before Supabase expires the URL.
const SIGNED_URL_TTL_SECONDS = 60 * 60
const SIGNED_URL_STALE_MS = (SIGNED_URL_TTL_SECONDS - 5 * 60) * 1000

export function useWinePhotoUrl(stored: string | null | undefined) {
  const path = extractPhotoPath(stored)
  return useQuery({
    queryKey: ['wine-photo', path],
    enabled: !!path,
    staleTime: SIGNED_URL_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .storage
        .from('wine-images')
        .createSignedUrl(path!, SIGNED_URL_TTL_SECONDS)
      if (error) throw error
      return data.signedUrl
    },
  })
}
