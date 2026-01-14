import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'
import { supabase } from './supabase'

type Wine = Database['public']['Tables']['wines']['Row']

export interface PairingRecommendation {
  wineId: string
  wineName: string
  vintage: number | null
  grapes: string[]
  rank: number
  pairingScore: number
  explanation: string
}

export interface PairingResponse {
  recommendations: PairingRecommendation[]
}

export interface WineEnrichmentData {
  name?: string
  grapes?: string[]
  vintage?: number
  drinkingWindow?: {
    start: number
    end: number
  }
  winery?: {
    name: string
    countryCode: string // ISO 3166-1 alpha-2
    matchedExistingId?: string // ID of existing winery if matched
  }
  price?: number
  foodPairings?: string
  confidence: 'high' | 'medium' | 'low'
  explanation: string
}

export interface WineEnrichmentResponse {
  enrichmentData: WineEnrichmentData | null
  error?: string
}

interface FoodPairingRequest {
  type: 'food-pairing'
  menu: string
  availableWines: Array<{
    id: string
    name: string
    vintage: number | null
    grapes: string[]
    quantity: number | null
    price: number | null
  }>
  language: 'en' | 'de-CH'
}

interface WineEnrichmentRequest {
  type: 'wine-enrichment'
  wineName: string
  existingVintage?: number | null
  existingWineries?: Array<{
    id: string
    name: string
    country_code: string
  }>
}

interface WineEnrichmentFromImageRequest {
  type: 'wine-enrichment-from-image'
  base64Image: string
  imageMediaType: string
  existingWineries?: Array<{
    id: string
    name: string
    country_code: string
  }>
}

async function callClaudeProxy<T>(
  request: FoodPairingRequest | WineEnrichmentRequest | WineEnrichmentFromImageRequest
): Promise<T> {
  // Use Supabase's built-in functions.invoke() method
  // This automatically includes the auth token from the current session
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: request,
  })

  if (error) {
    console.error('Edge Function error:', error)
    throw new Error(error.message || 'Failed to call Claude API proxy')
  }

  if (!data) {
    throw new Error('No data returned from Claude API proxy')
  }

  return data as T
}

export async function getFoodPairing(
  menu: string,
  availableWines: Wine[],
  language: 'en' | 'de-CH' = 'de-CH'
): Promise<PairingResponse> {
  // Start Sentry span for performance tracking
  return Sentry.startSpan(
    {
      name: 'claude.getFoodPairing',
      op: 'ai.request',
      attributes: {
        'ai.model': 'claude-sonnet-4-5-20250929',
        'ai.request.wines_count': availableWines.length,
        'ai.request.language': language,
        'ai.request.menu_length': menu.length,
      },
    },
    async (span) => {
      try {
        // Add breadcrumb for API call
        Sentry.addBreadcrumb({
          category: 'ai.request',
          message: 'Requesting food pairing from Claude',
          level: 'info',
          data: {
            winesCount: availableWines.length,
            menuLength: menu.length,
            language,
          },
        })

        const request: FoodPairingRequest = {
          type: 'food-pairing',
          menu,
          availableWines: availableWines.map((w) => ({
            id: w.id,
            name: w.name,
            vintage: w.vintage,
            grapes: w.grapes,
            quantity: w.quantity,
            price: w.price,
          })),
          language,
        }

        const result = await callClaudeProxy<PairingResponse>(request)

        // Track successful response
        span.setStatus({ code: 1, message: 'ok' })

        Sentry.addBreadcrumb({
          category: 'ai.response',
          message: 'Received food pairing from Claude',
          level: 'info',
        })

        return result
      } catch (error) {
        // Enhanced error tracking with context
        span.setStatus({ code: 2, message: 'error' })

        Sentry.captureException(error, {
          tags: {
            errorType: 'claude_api_error',
            component: 'ClaudeAPI',
            operation: 'getFoodPairing',
          },
          contexts: {
            request: {
              wines_count: availableWines.length,
              menu_length: menu.length,
              language,
            },
          },
        })

        throw error
      }
    }
  )
}

export async function enrichWineData(
  wineName: string,
  existingVintage?: number | null,
  existingWineries?: Array<{ id: string; name: string; country_code: string }>
): Promise<WineEnrichmentResponse> {
  return Sentry.startSpan(
    {
      name: 'claude.enrichWineData',
      op: 'ai.request',
      attributes: {
        'ai.model': 'claude-sonnet-4-5-20250929',
        'ai.request.wine_name': wineName,
        'ai.request.has_vintage': !!existingVintage,
        'ai.request.wineries_count': existingWineries?.length || 0,
      },
    },
    async (span) => {
      try {
        Sentry.addBreadcrumb({
          category: 'ai.request',
          message: 'Requesting wine enrichment from Claude',
          level: 'info',
          data: {
            wineName,
            hasVintage: !!existingVintage,
            wineriesCount: existingWineries?.length || 0,
          },
        })

        const request: WineEnrichmentRequest = {
          type: 'wine-enrichment',
          wineName,
          existingVintage,
          existingWineries,
        }

        const result = await callClaudeProxy<WineEnrichmentResponse>(request)

        // Track successful response
        span.setStatus({ code: 1, message: 'ok' })

        Sentry.addBreadcrumb({
          category: 'ai.response',
          message: 'Received wine enrichment from Claude',
          level: 'info',
        })

        return result
      } catch (error) {
        span.setStatus({ code: 2, message: 'error' })

        Sentry.captureException(error, {
          tags: {
            errorType: 'claude_api_error',
            component: 'ClaudeAPI',
            operation: 'enrichWineData',
          },
          contexts: {
            request: {
              wine_name: wineName,
              has_vintage: !!existingVintage,
              wineries_count: existingWineries?.length || 0,
            },
          },
        })

        return {
          enrichmentData: null,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to enrich wine data with AI',
        }
      }
    }
  )
}

export async function enrichWineFromImage(
  file: File,
  existingWineries?: Array<{ id: string; name: string; country_code: string }>
): Promise<WineEnrichmentResponse> {
  return Sentry.startSpan(
    {
      name: 'claude.enrichWineFromImage',
      op: 'ai.request',
      attributes: {
        'ai.model': 'claude-sonnet-4-5-20250929',
        'ai.request.file_size': file.size,
        'ai.request.file_type': file.type,
      },
    },
    async (span) => {
      try {
        Sentry.addBreadcrumb({
          category: 'ai.request',
          message: 'Requesting wine enrichment from image',
          level: 'info',
          data: {
            fileSize: file.size,
            fileType: file.type,
            wineriesCount: existingWineries?.length || 0,
          },
        })

        // Convert file to base64
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const request: WineEnrichmentFromImageRequest = {
          type: 'wine-enrichment-from-image',
          base64Image,
          imageMediaType: file.type,
          existingWineries,
        }

        const result = await callClaudeProxy<WineEnrichmentResponse>(request)

        span.setStatus({ code: 1, message: 'ok' })
        return result
      } catch (error) {
        span.setStatus({ code: 2, message: 'error' })
        Sentry.captureException(error)
        return {
          enrichmentData: null,
          error: error instanceof Error ? error.message : 'Failed to identify wine from photo',
        }
      }
    }
  )
}
