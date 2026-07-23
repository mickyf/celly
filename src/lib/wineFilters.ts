import type { Database } from '../types/database'
import type { WineFilterValues } from '../components/WineFilters'

type Wine = Database['public']['Tables']['wines']['Row']
type Winery = Database['public']['Tables']['wineries']['Row']

export const DEFAULT_WINE_FILTERS: WineFilterValues = {
  search: '',
  winery: null,
  grapes: [],
  wineTypes: [],
  bottleSizes: [],
  vintageMin: null,
  vintageMax: null,
  priceMin: null,
  priceMax: null,
  drinkingWindow: 'all',
  dataCompleteness: 'all',
  wineState: 'available',
}

export function applyWineFilters(
  wines: Wine[],
  wineries: Pick<Winery, 'id' | 'name'>[] | undefined,
  filters: WineFilterValues,
  currentYear: number = new Date().getFullYear(),
): Wine[] {
  return wines.filter((wine) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const wineNameMatch = wine.name?.toLowerCase().includes(searchLower) || false
      const winery = wineries?.find((w) => w.id === wine.winery_id)
      const wineryNameMatch = winery?.name?.toLowerCase().includes(searchLower) || false
      if (!wineNameMatch && !wineryNameMatch) return false
    }

    if (filters.winery && wine.winery_id !== filters.winery) return false

    if (filters.grapes.length > 0) {
      const hasMatchingGrape = filters.grapes.some((grape) => wine.grapes?.includes(grape))
      if (!hasMatchingGrape) return false
    }

    if (filters.wineTypes.length > 0) {
      if (!wine.wine_type || !filters.wineTypes.includes(wine.wine_type)) return false
    }

    if (filters.bottleSizes.length > 0) {
      if (!wine.bottle_size || !filters.bottleSizes.includes(wine.bottle_size)) return false
    }

    if (filters.vintageMin !== null && wine.vintage && wine.vintage < filters.vintageMin) return false
    if (filters.vintageMax !== null && wine.vintage && wine.vintage > filters.vintageMax) return false

    if (filters.priceMin !== null && wine.price && wine.price < filters.priceMin) return false
    if (filters.priceMax !== null && wine.price && wine.price > filters.priceMax) return false

    if (filters.drinkingWindow !== 'all') {
      if (!wine.drink_window_start || !wine.drink_window_end) return false
      const isReady = currentYear >= wine.drink_window_start && currentYear <= wine.drink_window_end
      const isFuture = currentYear < wine.drink_window_start
      const isPast = currentYear > wine.drink_window_end
      if (filters.drinkingWindow === 'ready' && !isReady) return false
      if (filters.drinkingWindow === 'future' && !isFuture) return false
      if (filters.drinkingWindow === 'past' && !isPast) return false
    }

    if (filters.dataCompleteness !== 'all') {
      const hasGrapes = !!wine.grapes && wine.grapes.length > 0
      const hasVintage = wine.vintage !== null
      const hasDrinkWindow = wine.drink_window_start !== null && wine.drink_window_end !== null
      const hasWinery = wine.winery_id !== null
      const hasPrice = wine.price !== null

      const isComplete = hasGrapes && hasVintage && hasDrinkWindow && hasWinery && hasPrice
      if (filters.dataCompleteness === 'complete' && !isComplete) return false
      if (filters.dataCompleteness === 'incomplete' && isComplete) return false
    }

    if (filters.wineState !== 'all') {
      const isDrunken = (wine.quantity ?? 0) === 0
      if (filters.wineState === 'available' && isDrunken) return false
      if (filters.wineState === 'drunken' && !isDrunken) return false
    }

    return true
  })
}

export function countActiveWineFilters(filters: WineFilterValues): number {
  let count = 0
  if (filters.search) count++
  if (filters.winery) count++
  if (filters.grapes.length > 0) count++
  if (filters.wineTypes.length > 0) count++
  if (filters.bottleSizes.length > 0) count++
  if (filters.vintageMin !== null || filters.vintageMax !== null) count++
  if (filters.priceMin !== null || filters.priceMax !== null) count++
  if (filters.drinkingWindow !== 'all') count++
  if (filters.dataCompleteness !== 'all') count++
  if (filters.wineState !== 'available') count++
  return count
}

export type DrinkWindowStatus = 'ready' | 'future' | 'past' | 'unknown'

export function getDrinkWindowStatus(
  wine: Pick<Wine, 'drink_window_start' | 'drink_window_end'>,
  currentYear: number = new Date().getFullYear(),
): DrinkWindowStatus {
  const { drink_window_start: start, drink_window_end: end } = wine
  if (start === null || end === null) return 'unknown'
  if (currentYear < start) return 'future'
  if (currentYear > end) return 'past'
  return 'ready'
}

export function wineNeedsEnrichment(wine: Wine): boolean {
  const needsGrapes = !wine.grapes || wine.grapes.length === 0
  const needsVintage = wine.vintage === null
  const needsDrinkWindow = wine.drink_window_start === null || wine.drink_window_end === null
  const needsWinery = wine.winery_id === null
  const needsPrice = wine.price === null
  const needsFoodPairings = !wine.food_pairings || wine.food_pairings.trim().length === 0
  const needsWineType = wine.wine_type === null
  return needsGrapes || needsVintage || needsDrinkWindow || needsWinery || needsPrice || needsFoodPairings || needsWineType
}
