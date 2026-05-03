import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import {
  WINE_COUNTRY_CODES,
  getWineCountries,
  getCountryOptions,
  getCountryByCode,
} from './countries'

const fakeT = ((key: string) => `translated:${key}`) as unknown as TFunction

describe('countries', () => {
  it('returns a non-empty alphabetised list of country codes', () => {
    expect(WINE_COUNTRY_CODES.length).toBeGreaterThan(0)
    const codes = WINE_COUNTRY_CODES.map((c) => c.code)
    expect([...codes].sort()).toEqual(codes)
  })

  describe('getWineCountries', () => {
    it('maps every code to {code, name, flag} using the provided translator', () => {
      const result = getWineCountries(fakeT)
      expect(result).toHaveLength(WINE_COUNTRY_CODES.length)
      const ch = result.find((c) => c.code === 'CH')
      expect(ch).toEqual({ code: 'CH', name: 'translated:common:countries.CH', flag: '🇨🇭' })
    })
  })

  describe('getCountryOptions', () => {
    it('produces Select options with flag-prefixed labels', () => {
      const options = getCountryOptions(fakeT)
      const fr = options.find((o) => o.value === 'FR')
      expect(fr?.label).toBe('🇫🇷 translated:common:countries.FR')
    })
  })

  describe('getCountryByCode', () => {
    it('returns the matching country', () => {
      expect(getCountryByCode('IT', fakeT)).toEqual({
        code: 'IT',
        name: 'translated:common:countries.IT',
        flag: '🇮🇹',
      })
    })

    it('returns undefined for an unknown code', () => {
      expect(getCountryByCode('XX', fakeT)).toBeUndefined()
    })
  })
})
