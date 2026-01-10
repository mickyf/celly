import { useMutation } from '@tanstack/react-query'
import { getFoodPairing, type PairingResponse } from '../lib/claude'
import { notifications } from '@mantine/notifications'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

interface PairingRequest {
  menu: string
  wines: Wine[]
  language?: 'en' | 'de-CH'
}

export const useFoodPairing = () => {
  return useMutation({
    mutationFn: async ({ menu, wines, language = 'de-CH' }: PairingRequest): Promise<PairingResponse> => {
      if (wines.length === 0) {
        throw new Error('No wines available in your cellar for pairing')
      }

      return await getFoodPairing(menu, wines, language)
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Pairing failed',
        message: error.message,
        color: 'red',
      })
    },
  })
}
