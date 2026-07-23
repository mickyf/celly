import type { TFunction } from 'i18next'

export const WINE_TYPES = ['red', 'white', 'rose', 'sparkling', 'dessert', 'port'] as const

export type WineType = (typeof WINE_TYPES)[number]

export function isWineType(value: unknown): value is WineType {
  return typeof value === 'string' && (WINE_TYPES as readonly string[]).includes(value)
}

// Mantine badge colours per type.
export const WINE_TYPE_COLORS: Record<WineType, string> = {
  red: 'red',
  white: 'yellow',
  rose: 'pink',
  sparkling: 'cyan',
  dessert: 'orange',
  port: 'grape',
}

export function getWineTypeLabel(t: TFunction, type: WineType): string {
  return t(`wines:wineType.options.${type}`)
}

export function getWineTypeOptions(t: TFunction): { value: WineType; label: string }[] {
  return WINE_TYPES.map((type) => ({ value: type, label: getWineTypeLabel(t, type) }))
}
