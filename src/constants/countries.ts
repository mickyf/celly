export interface Country {
  code: string
  name: string
  flag: string
}

export const WINE_COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
]

export const COUNTRY_OPTIONS = WINE_COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.name}`,
}))

export const getCountryByCode = (code: string): Country | undefined =>
  WINE_COUNTRIES.find((c) => c.code === code)
