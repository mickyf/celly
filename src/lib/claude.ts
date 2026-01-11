import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'
import { WINE_COUNTRIES } from '../constants/countries'

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
      const apiKey = import.meta.env.VITE_CLAUDE_API_KEY

      if (!apiKey || apiKey === 'your-claude-api-key-here') {
        const error = new Error(
          'Claude API key not configured. Please add VITE_CLAUDE_API_KEY to your .env.local file'
        )
        Sentry.captureException(error, {
          tags: {
            errorType: 'configuration',
            component: 'ClaudeAPI',
            operation: 'getFoodPairing',
          },
        })
        throw error
      }

      const anthropic = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true, // For local development only
      })

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

        // Format wine list for Claude
        const wineList = availableWines
          .map(
            (w, idx) =>
              `${idx + 1}. ${w.name}${w.vintage ? ` (${w.vintage})` : ''} - Grapes: ${w.grapes.length > 0 ? w.grapes.join(', ') : 'Not specified'}, Quantity: ${w.quantity}${w.price ? `, Price: $${w.price}` : ''}`
          )
          .join('\n')

        // Determine language instruction
        const languageInstruction =
          language === 'de-CH'
            ? 'IMPORTANT: Write all explanations in Swiss Standard German (Schweizer Hochdeutsch), NOT dialect. Use standard German grammar and vocabulary as used in Switzerland. Key differences: use "ss" instead of "ß", prefer Swiss terminology.'
            : 'Write all explanations in English.'

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `You are an expert sommelier. Given this menu/dish and available wines from the user's cellar, suggest the best wine pairings.

Menu/Dish: ${menu}

Available wines in cellar:
${wineList}

Please provide your top 3 wine recommendations. For each wine, explain why it pairs well with the dish, highlighting specific flavor interactions, complementary characteristics, or traditional pairing principles.

${languageInstruction}

Return your response as a JSON object with this exact structure:
{
  "recommendations": [
    {
      "wineIndex": 1,
      "rank": 1,
      "pairingScore": 95,
      "explanation": "Detailed explanation of why this wine pairs well..."
    }
  ]
}

Important:
- wineIndex should match the number from the wine list above (1-indexed)
- pairingScore should be between 1-100
- rank should be 1, 2, or 3
- explanation should be 2-4 sentences explaining the pairing
- Only recommend wines that are actually in the list
- Consider the wine's grape varieties, typical characteristics, and how they complement the food`,
            },
          ],
        })

        // Track successful response
        span.setStatus({ code: 1, message: 'ok' })
        span.setAttribute('ai.response.tokens', message.usage.output_tokens)
        span.setAttribute('ai.response.input_tokens', message.usage.input_tokens)

        Sentry.addBreadcrumb({
          category: 'ai.response',
          message: 'Received food pairing from Claude',
          level: 'info',
          data: {
            outputTokens: message.usage.output_tokens,
            inputTokens: message.usage.input_tokens,
            stopReason: message.stop_reason,
          },
        })

        // Parse the response
        const responseText =
          message.content[0].type === 'text' ? message.content[0].text : ''

        // Extract JSON from the response (Claude might wrap it in markdown)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Failed to parse pairing response from Claude')
        }

        const parsedResponse = JSON.parse(jsonMatch[0])

        // Map the recommendations to include full wine details
        const recommendations: PairingRecommendation[] = parsedResponse.recommendations.map(
          (rec: any) => {
            const wine = availableWines[rec.wineIndex - 1]
            return {
              wineId: wine.id,
              wineName: wine.name,
              vintage: wine.vintage,
              grapes: wine.grapes,
              rank: rec.rank,
              pairingScore: rec.pairingScore,
              explanation: rec.explanation,
            }
          }
        )

        return { recommendations }
      } catch (error) {
        // Enhanced error tracking with context
        span.setStatus({ code: 2, message: 'error' })

        if (error instanceof Anthropic.APIError) {
          // Claude API-specific errors
          Sentry.captureException(error, {
            tags: {
              errorType: 'claude_api_error',
              component: 'ClaudeAPI',
              operation: 'getFoodPairing',
              statusCode: error.status?.toString(),
            },
            contexts: {
              claude: {
                status_code: error.status,
                request_id: error.headers?.['request-id'],
              },
              request: {
                wines_count: availableWines.length,
                menu_length: menu.length,
                language,
              },
            },
          })

          // Check for rate limiting
          if (error.status === 429) {
            throw new Error(
              'Rate limit exceeded. Please try again in a few moments.'
            )
          }
        } else {
          // Generic errors
          Sentry.captureException(error, {
            tags: {
              errorType: 'unknown',
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
        }

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
      const apiKey = import.meta.env.VITE_CLAUDE_API_KEY

      if (!apiKey || apiKey === 'your-claude-api-key-here') {
        return {
          enrichmentData: null,
          error:
            'Claude API key not configured. Please add VITE_CLAUDE_API_KEY to your .env.local file',
        }
      }

      const anthropic = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true, // For local development only
      })

      const currentYear = new Date().getFullYear()

      // Format existing wineries list
      const wineriesListText =
        existingWineries && existingWineries.length > 0
          ? `\n\nExisting wineries in the user's collection:\n${existingWineries
            .map((w, idx) => `${idx + 1}. "${w.name}" (${w.country_code}) [ID: ${w.id}]`)
            .join('\n')}`
          : ''

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

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `You are a wine expert. I need you to identify this wine and provide structured data about it.

Wine name: ${wineName}${existingVintage ? ` (vintage: ${existingVintage})` : ''}${wineriesListText}

Please identify the wine and provide:
1. Grape varieties used in this wine
2. Vintage year (if not already provided and if it's a specific wine)
3. Recommended drinking window (earliest and latest year to drink this wine, considering the current year is ${currentYear})
4. Winery name and country of origin (use ISO 3166-1 alpha-2 country code)
5. Approximate retail price per bottle in USD (only if you can provide a reasonable estimate based on the wine's reputation and vintage)
6. Food pairing recommendations IN SWISS STANDARD GERMAN (Schweizer Hochdeutsch) - suggest dishes, ingredients, and cuisines that pair well with this wine based on its characteristics. Use Swiss Standard German, NOT dialect.
7. IMPORTANT: If the winery matches one of the existing wineries above (considering variations like "Château" vs "Chateau", "&" vs "and", etc.), include the matchedExistingId field with that winery's ID

Return your response as a JSON object with this exact structure:
{
  "grapes": ["Cabernet Sauvignon", "Merlot"],
  "vintage": 2015,
  "drinkingWindow": {
    "start": 2020,
    "end": 2035
  },
  "winery": {
    "name": "Château Example",
    "countryCode": "FR",
    "matchedExistingId": "uuid-if-matched-existing-winery"
  },
  "price": 150.00,
  "foodPairings": "Gegrilltes Rindfleisch, gereifter Käse wie Gruyère oder Comté, Lammbraten, Schmorgerichte, Pilzrisotto",
  "confidence": "high",
  "explanation": "Brief explanation of your identification and confidence level"
}

Important guidelines:
- Only include fields you can confidently identify
- If the wine name is too generic (e.g., just "Merlot") or you cannot identify it, set confidence to "low"
- Vintage should be between 1800 and 2030
- Drinking window start must be less than end
- Country codes must be valid ISO 3166-1 alpha-2 codes (2 letters, uppercase)
- Valid country codes: ${WINE_COUNTRIES.map((c) => c.code).join(', ')}
- Price should be a reasonable retail price estimate in USD (positive number, typically between 10 and 10000 for most wines)
- Only include price if you can make a reasonable estimate based on the wine's quality, vintage, and reputation
- foodPairings MUST be in Swiss Standard German (Schweizer Hochdeutsch), NOT dialect. Use standard German grammar and vocabulary as used in Switzerland. Key differences from German German: use "ss" instead of "ß" (e.g., "Rindfleisch" not "Rindfleisch"), prefer Swiss terminology (e.g., "Rindfleisch" for beef, "Käse" for cheese). It should be a comma-separated list of dishes and ingredients (e.g., "Gegrilltes Rindfleisch, gereifter Käse, Lammbraten, Schmorgerichte"). Base recommendations on the wine's grape varieties and traditional pairings.
- Confidence should be "high" for specific, well-known wines, "medium" for regional wines, "low" for generic varieties
- If you cannot identify the wine at all, return confidence: "low" with minimal data
- For winery matching: Consider variations in spelling, punctuation, abbreviations, etc. For example, "Domaine de la Romanée-Conti" matches "Domaine de la Romanee Conti", "Château Margaux" matches "Chateau Margaux", "Smith & Sons" matches "Smith and Sons"
- Only include matchedExistingId if you're confident the winery is the same, accounting for spelling variations`,
            },
          ],
        })

        // Track successful response
        span.setStatus({ code: 1, message: 'ok' })
        span.setAttribute('ai.response.tokens', message.usage.output_tokens)
        span.setAttribute('ai.response.input_tokens', message.usage.input_tokens)

        Sentry.addBreadcrumb({
          category: 'ai.response',
          message: 'Received wine enrichment from Claude',
          level: 'info',
          data: {
            outputTokens: message.usage.output_tokens,
            inputTokens: message.usage.input_tokens,
          },
        })

        // Parse the response
        const responseText =
          message.content[0].type === 'text' ? message.content[0].text : ''

        // Extract JSON from the response (Claude might wrap it in markdown)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          return {
            enrichmentData: null,
            error: 'Failed to parse enrichment response from Claude',
          }
        }

        const parsedResponse = JSON.parse(jsonMatch[0])

        // Validate the response data
        const enrichmentData: WineEnrichmentData = {
          confidence: parsedResponse.confidence || 'low',
          explanation: parsedResponse.explanation || 'No explanation provided',
        }

        // Validate grapes
        if (
          parsedResponse.grapes &&
          Array.isArray(parsedResponse.grapes) &&
          parsedResponse.grapes.length > 0
        ) {
          enrichmentData.grapes = parsedResponse.grapes
        }

        // Validate vintage
        if (
          parsedResponse.vintage &&
          typeof parsedResponse.vintage === 'number' &&
          parsedResponse.vintage >= 1800 &&
          parsedResponse.vintage <= 2030
        ) {
          enrichmentData.vintage = parsedResponse.vintage
        }

        // Validate drinking window
        if (
          parsedResponse.drinkingWindow &&
          typeof parsedResponse.drinkingWindow.start === 'number' &&
          typeof parsedResponse.drinkingWindow.end === 'number' &&
          parsedResponse.drinkingWindow.start < parsedResponse.drinkingWindow.end
        ) {
          enrichmentData.drinkingWindow = {
            start: parsedResponse.drinkingWindow.start,
            end: parsedResponse.drinkingWindow.end,
          }
        }

        // Validate winery
        if (
          parsedResponse.winery &&
          parsedResponse.winery.name &&
          parsedResponse.winery.countryCode
        ) {
          const validCountryCode = WINE_COUNTRIES.some(
            (c) => c.code === parsedResponse.winery.countryCode.toUpperCase()
          )
          if (validCountryCode) {
            enrichmentData.winery = {
              name: parsedResponse.winery.name,
              countryCode: parsedResponse.winery.countryCode.toUpperCase(),
            }
            // Include matched ID if provided and valid
            if (
              parsedResponse.winery.matchedExistingId &&
              existingWineries?.some((w) => w.id === parsedResponse.winery.matchedExistingId)
            ) {
              enrichmentData.winery.matchedExistingId = parsedResponse.winery.matchedExistingId
            }
          }
        }

        // Validate price
        if (
          parsedResponse.price &&
          typeof parsedResponse.price === 'number' &&
          parsedResponse.price > 0 &&
          parsedResponse.price <= 100000
        ) {
          enrichmentData.price = parsedResponse.price
        }

        // Validate food pairings
        if (
          parsedResponse.foodPairings &&
          typeof parsedResponse.foodPairings === 'string' &&
          parsedResponse.foodPairings.trim().length > 0
        ) {
          enrichmentData.foodPairings = parsedResponse.foodPairings.trim()
        }

        return { enrichmentData }
      } catch (error) {
        span.setStatus({ code: 2, message: 'error' })

        if (error instanceof Anthropic.APIError) {
          Sentry.captureException(error, {
            tags: {
              errorType: 'claude_api_error',
              component: 'ClaudeAPI',
              operation: 'enrichWineData',
              statusCode: error.status?.toString(),
            },
            contexts: {
              claude: {
                status_code: error.status,
                request_id: error.headers?.['request-id'],
              },
              request: {
                wine_name: wineName,
                has_vintage: !!existingVintage,
                wineries_count: existingWineries?.length || 0,
              },
            },
          })
        }

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
