import Anthropic from '@anthropic-ai/sdk'
import type { Database } from '../types/database'

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

export async function getFoodPairing(
  menu: string,
  availableWines: Wine[]
): Promise<PairingResponse> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY

  if (!apiKey || apiKey === 'your-claude-api-key-here') {
    throw new Error(
      'Claude API key not configured. Please add VITE_CLAUDE_API_KEY to your .env.local file'
    )
  }

  const anthropic = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // For local development only
  })

  // Format wine list for Claude
  const wineList = availableWines
    .map(
      (w, idx) =>
        `${idx + 1}. ${w.name}${w.vintage ? ` (${w.vintage})` : ''} - Grapes: ${w.grapes.length > 0 ? w.grapes.join(', ') : 'Not specified'}, Quantity: ${w.quantity}${w.price ? `, Price: $${w.price}` : ''}`
    )
    .join('\n')

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
}
