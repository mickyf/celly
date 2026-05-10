export const BOTTLE_SIZES = ['37.5cl', '75cl', '150cl', '300cl', '500cl', '600cl'] as const

export type BottleSize = (typeof BOTTLE_SIZES)[number]

export const BOTTLE_SIZE_OPTIONS: { value: BottleSize; label: string }[] = [
  { value: '37.5cl', label: '37.5cl (Halbe Flasche)' },
  { value: '75cl', label: '75cl (Standard)' },
  { value: '150cl', label: '150cl (Magnum)' },
  { value: '300cl', label: '300cl (Double Magnum)' },
  { value: '500cl', label: '500cl (Jeroboam)' },
  { value: '600cl', label: '600cl (Imperial)' },
]
