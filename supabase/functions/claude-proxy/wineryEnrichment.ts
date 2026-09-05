/**
 * Validation for the `winery-enrichment` response.
 *
 * Kept out of index.ts so it can be unit-tested without Deno/npm specifiers.
 * Claude's output is untrusted: a winery is only enriched when the model
 * returns a country we actually offer in the country picker.
 */

export type EnrichmentConfidence = "high" | "medium" | "low"

export interface WineryEnrichmentData {
  countryCode: string
  confidence: EnrichmentConfidence
  explanation: string
}

const CONFIDENCE_LEVELS: readonly EnrichmentConfidence[] = ["high", "medium", "low"]

function validConfidence(value: unknown): EnrichmentConfidence {
  return typeof value === "string" && (CONFIDENCE_LEVELS as readonly string[]).includes(value)
    ? value as EnrichmentConfidence
    : "low"
}

/**
 * Returns the enrichment payload, or null when the country code is missing or
 * outside `allowedCountries`. Null means "nothing to apply" — callers surface
 * their own translated message rather than an English error string.
 */
export function validateWineryEnrichment(
  parsed: unknown,
  allowedCountries: readonly string[],
): WineryEnrichmentData | null {
  if (!parsed || typeof parsed !== "object") return null

  const response = parsed as Record<string, unknown>

  const rawCode = response.countryCode
  if (typeof rawCode !== "string") return null

  const countryCode = rawCode.trim().toUpperCase()
  if (!allowedCountries.includes(countryCode)) return null

  const explanation =
    typeof response.explanation === "string" && response.explanation.trim().length > 0
      ? response.explanation.trim()
      : "No explanation provided"

  return {
    countryCode,
    confidence: validConfidence(response.confidence),
    explanation,
  }
}
