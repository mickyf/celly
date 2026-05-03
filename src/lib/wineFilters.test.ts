import { describe, it, expect } from 'vitest'
import {
  applyWineFilters,
  countActiveWineFilters,
  getDrinkWindowStatus,
  wineNeedsEnrichment,
  DEFAULT_WINE_FILTERS,
} from './wineFilters'
import type { Database } from '../types/database'
import type { WineFilterValues } from '../components/WineFilters'

type Wine = Database['public']['Tables']['wines']['Row']

const wine = (overrides: Partial<Wine> = {}): Wine => ({
  bottle_size: '75cl',
  created_at: null,
  drink_window_end: 2030,
  drink_window_start: 2025,
  food_pairings: 'Cheese',
  grapes: ['Pinot Noir'],
  id: 'w-1',
  name: 'Test Wine',
  photo_url: null,
  price: 50,
  quantity: 1,
  updated_at: null,
  user_id: 'u-1',
  vintage: 2020,
  winery_id: 'wy-1',
  ...overrides,
})

const wineries = [
  { id: 'wy-1', name: 'Château Test' },
  { id: 'wy-2', name: 'Domaine Other' },
]

const filters = (overrides: Partial<WineFilterValues> = {}): WineFilterValues => ({
  ...DEFAULT_WINE_FILTERS,
  ...overrides,
})

describe('applyWineFilters', () => {
  it('returns all wines when filters are default', () => {
    const wines = [wine({ id: 'a' }), wine({ id: 'b' })]
    expect(applyWineFilters(wines, wineries, filters())).toHaveLength(2)
  })

  describe('search', () => {
    it('matches wine name (case-insensitive)', () => {
      const wines = [wine({ name: 'Barolo Riserva' }), wine({ name: 'Chianti' })]
      const out = applyWineFilters(wines, wineries, filters({ search: 'BAROLO' }))
      expect(out).toHaveLength(1)
      expect(out[0].name).toBe('Barolo Riserva')
    })

    it('matches winery name', () => {
      const wines = [
        wine({ id: 'a', name: 'A', winery_id: 'wy-1' }),
        wine({ id: 'b', name: 'B', winery_id: 'wy-2' }),
      ]
      const out = applyWineFilters(wines, wineries, filters({ search: 'château' }))
      expect(out.map((w) => w.id)).toEqual(['a'])
    })

    it('returns empty when nothing matches', () => {
      const wines = [wine({ name: 'A' })]
      expect(applyWineFilters(wines, wineries, filters({ search: 'zzz' }))).toHaveLength(0)
    })
  })

  it('filters by winery id', () => {
    const wines = [wine({ id: 'a', winery_id: 'wy-1' }), wine({ id: 'b', winery_id: 'wy-2' })]
    const out = applyWineFilters(wines, wineries, filters({ winery: 'wy-2' }))
    expect(out.map((w) => w.id)).toEqual(['b'])
  })

  describe('grapes', () => {
    it('keeps wines that contain at least one selected grape (OR within filter)', () => {
      const wines = [
        wine({ id: 'a', grapes: ['Pinot Noir'] }),
        wine({ id: 'b', grapes: ['Merlot'] }),
        wine({ id: 'c', grapes: ['Syrah'] }),
      ]
      const out = applyWineFilters(wines, wineries, filters({ grapes: ['Pinot Noir', 'Merlot'] }))
      expect(out.map((w) => w.id).sort()).toEqual(['a', 'b'])
    })
  })

  describe('bottle size', () => {
    it('keeps wines whose bottle_size is in the selected set', () => {
      const wines = [
        wine({ id: 'a', bottle_size: '75cl' }),
        wine({ id: 'b', bottle_size: '150cl' }),
        wine({ id: 'c', bottle_size: null }),
      ]
      const out = applyWineFilters(wines, wineries, filters({ bottleSizes: ['75cl'] }))
      expect(out.map((w) => w.id)).toEqual(['a'])
    })
  })

  describe('vintage range', () => {
    it('respects min and max boundaries', () => {
      const wines = [
        wine({ id: 'a', vintage: 2018 }),
        wine({ id: 'b', vintage: 2020 }),
        wine({ id: 'c', vintage: 2022 }),
      ]
      const out = applyWineFilters(wines, wineries, filters({ vintageMin: 2019, vintageMax: 2021 }))
      expect(out.map((w) => w.id)).toEqual(['b'])
    })
  })

  describe('price range', () => {
    it('respects min and max boundaries', () => {
      const wines = [
        wine({ id: 'a', price: 10 }),
        wine({ id: 'b', price: 50 }),
        wine({ id: 'c', price: 100 }),
      ]
      const out = applyWineFilters(wines, wineries, filters({ priceMin: 20, priceMax: 60 }))
      expect(out.map((w) => w.id)).toEqual(['b'])
    })
  })

  describe('drinking window', () => {
    const wines = [
      wine({ id: 'ready', drink_window_start: 2024, drink_window_end: 2028 }),
      wine({ id: 'future', drink_window_start: 2030, drink_window_end: 2035 }),
      wine({ id: 'past', drink_window_start: 2010, drink_window_end: 2020 }),
      wine({ id: 'unset', drink_window_start: null, drink_window_end: null }),
    ]

    it('"ready" keeps wines whose window contains current year', () => {
      const out = applyWineFilters(wines, wineries, filters({ drinkingWindow: 'ready' }), 2026)
      expect(out.map((w) => w.id)).toEqual(['ready'])
    })

    it('"future" keeps wines whose window starts after current year', () => {
      const out = applyWineFilters(wines, wineries, filters({ drinkingWindow: 'future' }), 2026)
      expect(out.map((w) => w.id)).toEqual(['future'])
    })

    it('"past" keeps wines whose window ended before current year', () => {
      const out = applyWineFilters(wines, wineries, filters({ drinkingWindow: 'past' }), 2026)
      expect(out.map((w) => w.id)).toEqual(['past'])
    })

    it('drops wines with no window set when a non-"all" filter is active', () => {
      const out = applyWineFilters(wines, wineries, filters({ drinkingWindow: 'ready' }), 2026)
      expect(out.find((w) => w.id === 'unset')).toBeUndefined()
    })
  })

  describe('data completeness', () => {
    const complete = wine({
      id: 'complete',
      grapes: ['Merlot'],
      vintage: 2020,
      drink_window_start: 2025,
      drink_window_end: 2030,
      winery_id: 'wy-1',
      price: 50,
    })
    const missingPrice = wine({ id: 'incomplete', price: null })

    it('"complete" keeps only wines with all enrichment fields', () => {
      const out = applyWineFilters(
        [complete, missingPrice],
        wineries,
        filters({ dataCompleteness: 'complete' }),
      )
      expect(out.map((w) => w.id)).toEqual(['complete'])
    })

    it('"incomplete" keeps only wines missing at least one field', () => {
      const out = applyWineFilters(
        [complete, missingPrice],
        wineries,
        filters({ dataCompleteness: 'incomplete' }),
      )
      expect(out.map((w) => w.id)).toEqual(['incomplete'])
    })
  })

  it('combines filters with AND', () => {
    const wines = [
      wine({ id: 'a', name: 'Barolo', winery_id: 'wy-1', vintage: 2018 }),
      wine({ id: 'b', name: 'Barolo', winery_id: 'wy-2', vintage: 2018 }),
      wine({ id: 'c', name: 'Chianti', winery_id: 'wy-1', vintage: 2018 }),
    ]
    const out = applyWineFilters(
      wines,
      wineries,
      filters({ search: 'Barolo', winery: 'wy-1' }),
    )
    expect(out.map((w) => w.id)).toEqual(['a'])
  })
})

describe('countActiveWineFilters', () => {
  it('returns 0 for default filters', () => {
    expect(countActiveWineFilters(filters())).toBe(0)
  })

  it('counts each non-default group once', () => {
    expect(
      countActiveWineFilters(
        filters({
          search: 'foo',
          winery: 'wy-1',
          grapes: ['Merlot'],
          bottleSizes: ['75cl'],
          vintageMin: 2018,
          vintageMax: 2022,
          priceMin: 10,
          priceMax: 100,
          drinkingWindow: 'ready',
          dataCompleteness: 'complete',
        }),
      ),
    ).toBe(8)
  })

  it('counts vintage as a single group when only min is set', () => {
    expect(countActiveWineFilters(filters({ vintageMin: 2018 }))).toBe(1)
  })

  it('counts price as a single group when only max is set', () => {
    expect(countActiveWineFilters(filters({ priceMax: 100 }))).toBe(1)
  })
})

describe('getDrinkWindowStatus', () => {
  it('returns "unknown" when either bound is null', () => {
    expect(getDrinkWindowStatus({ drink_window_start: null, drink_window_end: 2030 })).toBe('unknown')
    expect(getDrinkWindowStatus({ drink_window_start: 2025, drink_window_end: null })).toBe('unknown')
  })

  it('returns "future" when current year is before start', () => {
    expect(getDrinkWindowStatus({ drink_window_start: 2030, drink_window_end: 2035 }, 2026)).toBe(
      'future',
    )
  })

  it('returns "past" when current year is after end', () => {
    expect(getDrinkWindowStatus({ drink_window_start: 2010, drink_window_end: 2020 }, 2026)).toBe(
      'past',
    )
  })

  it('returns "ready" when current year is within bounds (inclusive)', () => {
    expect(getDrinkWindowStatus({ drink_window_start: 2026, drink_window_end: 2026 }, 2026)).toBe(
      'ready',
    )
    expect(getDrinkWindowStatus({ drink_window_start: 2025, drink_window_end: 2030 }, 2026)).toBe(
      'ready',
    )
  })
})

describe('wineNeedsEnrichment', () => {
  it('returns false for a fully populated wine', () => {
    expect(wineNeedsEnrichment(wine())).toBe(false)
  })

  it.each([
    ['grapes empty', { grapes: [] as string[] }],
    ['vintage missing', { vintage: null }],
    ['winery missing', { winery_id: null }],
    ['price missing', { price: null }],
    ['drink window start missing', { drink_window_start: null }],
    ['drink window end missing', { drink_window_end: null }],
    ['food pairings missing', { food_pairings: null }],
    ['food pairings whitespace only', { food_pairings: '   ' }],
  ])('returns true when %s', (_label, overrides) => {
    expect(wineNeedsEnrichment(wine(overrides as Partial<Wine>))).toBe(true)
  })
})
