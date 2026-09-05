import { describe, it, expect } from 'vitest'
import { validateWineryEnrichment } from './wineryEnrichment.ts'

const COUNTRIES = ['FR', 'IT', 'CH'] as const

describe('validateWineryEnrichment', () => {
  it('returns the payload for an allowed country code', () => {
    expect(
      validateWineryEnrichment(
        { countryCode: 'FR', confidence: 'high', explanation: 'Well-known Bordeaux producer' },
        COUNTRIES,
      ),
    ).toEqual({
      countryCode: 'FR',
      confidence: 'high',
      explanation: 'Well-known Bordeaux producer',
    })
  })

  it('normalises the country code to trimmed uppercase', () => {
    const result = validateWineryEnrichment(
      { countryCode: ' it ', confidence: 'medium', explanation: 'Piedmont' },
      COUNTRIES,
    )
    expect(result?.countryCode).toBe('IT')
  })

  it('rejects a country code outside the allowed list', () => {
    expect(
      validateWineryEnrichment(
        { countryCode: 'XX', confidence: 'high', explanation: 'made up' },
        COUNTRIES,
      ),
    ).toBeNull()
  })

  it('rejects a missing or non-string country code', () => {
    expect(validateWineryEnrichment({ confidence: 'low', explanation: 'unknown' }, COUNTRIES)).toBeNull()
    expect(validateWineryEnrichment({ countryCode: 42 }, COUNTRIES)).toBeNull()
    expect(validateWineryEnrichment({ countryCode: null }, COUNTRIES)).toBeNull()
  })

  it('rejects non-object input', () => {
    expect(validateWineryEnrichment(null, COUNTRIES)).toBeNull()
    expect(validateWineryEnrichment('FR', COUNTRIES)).toBeNull()
    expect(validateWineryEnrichment(undefined, COUNTRIES)).toBeNull()
  })

  it('falls back to low confidence when the level is missing or bogus', () => {
    expect(
      validateWineryEnrichment({ countryCode: 'CH', explanation: 'x' }, COUNTRIES)?.confidence,
    ).toBe('low')
    expect(
      validateWineryEnrichment(
        { countryCode: 'CH', confidence: 'certain', explanation: 'x' },
        COUNTRIES,
      )?.confidence,
    ).toBe('low')
  })

  it('substitutes a placeholder when the explanation is missing or blank', () => {
    expect(
      validateWineryEnrichment({ countryCode: 'FR', confidence: 'high' }, COUNTRIES)?.explanation,
    ).toBe('No explanation provided')
    expect(
      validateWineryEnrichment(
        { countryCode: 'FR', confidence: 'high', explanation: '   ' },
        COUNTRIES,
      )?.explanation,
    ).toBe('No explanation provided')
  })
})
