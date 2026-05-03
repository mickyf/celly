import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getFoodPairing, type PairingResponse } from '../lib/claude'
import { showMutationError } from '../lib/mutationError'
import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

interface PairingRequest {
  menu: string
  wines: Wine[]
  language?: 'en' | 'de-CH'
}

export const useFoodPairing = () => {
  const { t } = useTranslation('common')
  return useMutation({
    mutationFn: async ({ menu, wines, language = 'de-CH' }: PairingRequest): Promise<PairingResponse> => {
      Sentry.addBreadcrumb({
        category: 'ai.pairing',
        message: 'Requesting food pairing recommendation',
        level: 'info',
        data: {
          menuLength: menu.length,
          winesCount: wines.length,
          language,
        },
      })

      if (wines.length === 0) {
        const error = new Error('No wines available in your cellar for pairing')
        Sentry.captureException(error, {
          tags: {
            errorType: 'validation',
            operation: 'foodPairing',
          },
        })
        throw error
      }

      return await getFoodPairing(menu, wines, language)
    },
    onError: (error: Error) => showMutationError(t, error),
  })
}
