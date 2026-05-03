import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseMock, makeQueryBuilder } from '../test/supabaseMock'

vi.mock('../lib/supabase', async () => {
  const { getSupabaseMock } = await import('../test/supabaseMock')
  return { supabase: getSupabaseMock().supabase }
})

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  startSpan: <T,>(_opts: unknown, fn: (span: { setAttribute: () => void; setStatus: () => void }) => T) =>
    fn({ setAttribute: vi.fn(), setStatus: vi.fn() }),
}))

vi.mock('@mantine/notifications', async () => {
  const actual = await vi.importActual<typeof import('@mantine/notifications')>(
    '@mantine/notifications',
  )
  return {
    ...actual,
    notifications: { ...actual.notifications, show: vi.fn() },
  }
})

const enrichWineDataMock = vi.fn()
const enrichWineFromImageMock = vi.fn()
vi.mock('../lib/claude', () => ({
  enrichWineData: (...a: unknown[]) => enrichWineDataMock(...a),
  enrichWineFromImage: (...a: unknown[]) => enrichWineFromImageMock(...a),
}))

import { renderHookWithProviders } from '../test/renderHookWithProviders'
import { useEnrichWine, useBulkEnrichWines } from './useWineEnrichment'

const mockClient = getSupabaseMock()

const fullyPopulatedWine = {
  id: 'w-1',
  name: 'Barolo',
  vintage: 2018,
  grapes: ['Nebbiolo'],
  drink_window_start: 2025,
  drink_window_end: 2035,
  winery_id: 'wy-1',
  price: 80,
  food_pairings: 'Beef',
  bottle_size: '75cl',
  photo_url: null,
  quantity: 1,
  user_id: 'u',
  created_at: null,
  updated_at: null,
}

const sparseWine = {
  ...fullyPopulatedWine,
  vintage: null,
  grapes: [],
  drink_window_start: null,
  drink_window_end: null,
  winery_id: null,
  price: null,
  food_pairings: null,
}

beforeEach(() => {
  mockClient.fromMock.mockClear()
  mockClient.authGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 't@e.com' } },
    error: null,
  })
  enrichWineDataMock.mockReset()
  // wineries select returns an empty list by default; tests can override.
  mockClient.setTable('wineries', () => makeQueryBuilder({ data: [], error: null }))
  mockClient.setTable('wines', () =>
    makeQueryBuilder({ data: { id: 'w-1' }, error: null }),
  )
})

describe('useEnrichWine', () => {
  it('short-circuits when no field needs enrichment', async () => {
    const { result } = renderHookWithProviders(() => useEnrichWine())
    const out = await result.current.mutateAsync({ wine: fullyPopulatedWine })
    expect(out).toEqual({ fieldsUpdated: [], wineryCreated: false, noChanges: true })
    expect(enrichWineDataMock).not.toHaveBeenCalled()
  })

  it('throws when the AI returns an error', async () => {
    enrichWineDataMock.mockResolvedValueOnce({
      enrichmentData: null,
      error: 'rate limited',
    })

    const { result } = renderHookWithProviders(() => useEnrichWine())
    await expect(
      result.current.mutateAsync({ wine: sparseWine }),
    ).rejects.toThrow('rate limited')
  })

  it('updates the wine when the AI returns enrichment data', async () => {
    enrichWineDataMock.mockResolvedValueOnce({
      enrichmentData: {
        grapes: ['Nebbiolo'],
        vintage: 2019,
        drinkingWindow: { start: 2024, end: 2034 },
        price: 70,
        foodPairings: 'Wild boar',
        confidence: 'high',
      },
      error: null,
    })

    const wineBuilder = makeQueryBuilder({
      data: { id: 'w-1', vintage: 2019 },
      error: null,
    })
    mockClient.setTable('wines', wineBuilder)

    const { result } = renderHookWithProviders(() => useEnrichWine())
    const out = await result.current.mutateAsync({ wine: sparseWine })

    expect(out.fieldsUpdated.length).toBeGreaterThan(0)
    expect(out.noChanges).not.toBe(true)
    expect(wineBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        grapes: ['Nebbiolo'],
        vintage: 2019,
        drink_window_start: 2024,
        drink_window_end: 2034,
        price: 70,
        food_pairings: 'Wild boar',
      }),
    )
  })

  it('uses an existing fuzzy-matched winery when AI returns one', async () => {
    enrichWineDataMock.mockResolvedValueOnce({
      enrichmentData: {
        winery: { name: 'Chateau Margaux', countryCode: 'FR' },
        confidence: 'high',
      },
      error: null,
    })

    // Pre-populate the wineries select with a near-match (different accent).
    mockClient.setTable(
      'wineries',
      makeQueryBuilder({
        data: [{ id: 'wy-existing', name: 'Château Margaux', country_code: 'FR' }],
        error: null,
      }),
    )

    const wineBuilder = makeQueryBuilder({
      data: { id: 'w-1' },
      error: null,
    })
    mockClient.setTable('wines', wineBuilder)

    const { result } = renderHookWithProviders(() => useEnrichWine())
    const out = await result.current.mutateAsync({ wine: sparseWine })

    expect(out.wineryCreated).toBe(false)
    expect(wineBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ winery_id: 'wy-existing' }),
    )
  })
})

describe('useBulkEnrichWines', () => {
  it('reports progress and counts skipped, successful, failed', async () => {
    enrichWineDataMock
      .mockResolvedValueOnce({
        enrichmentData: { vintage: 2019, confidence: 'high' },
        error: null,
      })
      .mockResolvedValueOnce({
        enrichmentData: null,
        error: 'failed',
      })

    const onProgress = vi.fn()

    const { result } = renderHookWithProviders(() => useBulkEnrichWines())

    // Replace setTimeout so the 1s rate-limit delay between iterations is instant.
    const realSetTimeout = globalThis.setTimeout
    globalThis.setTimeout = ((fn: () => void) => {
      fn()
      return 0 as unknown as ReturnType<typeof setTimeout>
    }) as typeof setTimeout

    try {
      const out = await result.current.mutateAsync({
        wines: [
          { ...sparseWine, id: 'w-1', name: 'Wine 1' },
          { ...sparseWine, id: 'w-2', name: 'Wine 2' },
          { ...fullyPopulatedWine, id: 'w-3', name: 'Wine 3' },
        ],
        onProgress,
      })

      expect(out.total).toBe(3)
      expect(out.successful).toBe(1)
      expect(out.failed).toBe(1)
      expect(out.skipped).toBe(1)
      expect(out.errors[0]).toEqual({ wineName: 'Wine 2', error: 'failed' })

      // Final progress is reported as (total, total).
      expect(onProgress).toHaveBeenLastCalledWith(3, 3)
    } finally {
      globalThis.setTimeout = realSetTimeout
    }
  })
})
