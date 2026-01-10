import type { TFunction } from 'i18next'

export interface Country {
  code: string
  name: string
  flag: string
}

// Country codes with their flags
export const WINE_COUNTRY_CODES = [
  { code: 'AR', flag: '🇦🇷' },
  { code: 'AT', flag: '🇦🇹' },
  { code: 'AU', flag: '🇦🇺' },
  { code: 'CH', flag: '🇨🇭' },
  { code: 'CL', flag: '🇨🇱' },
  { code: 'DE', flag: '🇩🇪' },
  { code: 'ES', flag: '🇪🇸' },
  { code: 'FR', flag: '🇫🇷' },
  { code: 'GR', flag: '🇬🇷' },
  { code: 'IT', flag: '🇮🇹' },
  { code: 'NZ', flag: '🇳🇿' },
  { code: 'PT', flag: '🇵🇹' },
  { code: 'US', flag: '🇺🇸' },
  { code: 'ZA', flag: '🇿🇦' },
] as const

// Helper to get translated country list
export const getWineCountries = (t: TFunction): Country[] => {
  return WINE_COUNTRY_CODES.map((c) => ({
    code: c.code,
    name: t(`common:countries.${c.code}`),
    flag: c.flag,
  }))
}

// Helper to get country options for Select component
export const getCountryOptions = (t: TFunction) => {
  return WINE_COUNTRY_CODES.map((c) => ({
    value: c.code,
    label: `${c.flag} ${t(`common:countries.${c.code}`)}`,
  }))
}

// Helper to get a single country by code
export const getCountryByCode = (code: string, t: TFunction): Country | undefined => {
  const country = WINE_COUNTRY_CODES.find((c) => c.code === code)
  if (!country) return undefined

  return {
    code: country.code,
    name: t(`common:countries.${country.code}`),
    flag: country.flag,
  }
}

// Legacy exports (deprecated - kept for backward compatibility during migration)
export const WINE_COUNTRIES: Country[] = WINE_COUNTRY_CODES.map((c) => ({
  code: c.code,
  name: c.code, // Fallback to code if translation not available
  flag: c.flag,
}))

export const COUNTRY_OPTIONS = WINE_COUNTRY_CODES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.code}`,
}))
