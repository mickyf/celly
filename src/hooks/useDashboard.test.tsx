import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { getSupabaseMock, makeQueryBuilder } from '../test/supabaseMock'

vi.mock('../lib/supabase', async () => {
  const { getSupabaseMock } = await import('../test/supabaseMock')
  return { supabase: getSupabaseMock().supabase }
})

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}))

import { renderHookWithProviders } from '../test/renderHookWithProviders'
import { useDashboardStats } from './useDashboard'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.fromMock.mockClear()
  mockClient.authGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 't@e.com' } },
    error: null,
  })
})

describe('useDashboardStats', () => {
  it('throws when no user is authenticated', async () => {
    mockClient.authGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const { result } = renderHookWithProviders(() => useDashboardStats())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('Not authenticated')
  })

  it('aggregates bottles, value, ready-to-drink count and top grapes', async () => {
    mockClient.setTable(
      'wines',
      makeQueryBuilder({
        data: [
          {
            id: 'a',
            quantity: 3,
            price: 20,
            drink_window_start: 2000,
            drink_window_end: 2030,
            grapes: ['Merlot', 'Cabernet Sauvignon'],
          },
          {
            id: 'b',
            quantity: 2,
            price: 50,
            drink_window_start: 2030,
            drink_window_end: 2035,
            grapes: ['Merlot'],
          },
          {
            id: 'c',
            quantity: 1,
            price: null,
            drink_window_start: null,
            drink_window_end: null,
            grapes: ['Pinot Noir'],
          },
        ],
        error: null,
      }),
    )
    mockClient.setTable(
      'stock_movements',
      makeQueryBuilder({ data: [], error: null }),
    )

    const { result } = renderHookWithProviders(() => useDashboardStats())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const stats = result.current.data!
    expect(stats.totalWines).toBe(3)
    expect(stats.totalBottles).toBe(6)
    expect(stats.totalValue).toBe(3 * 20 + 2 * 50) // 160; 'c' has null price → contributes 0
    // current year (2026) is in [2000, 2030] only for wine 'a'.
    expect(stats.readyToDrink).toBe(1)
    expect(stats.topGrapes[0]).toEqual({ grape: 'Merlot', count: 2 })
    expect(stats.consumptionData).toEqual([])
  })

  it('excludes drunken wines (quantity 0) from totals, ready count and top grapes', async () => {
    mockClient.setTable(
      'wines',
      makeQueryBuilder({
        data: [
          { id: 'live', quantity: 2, price: 30, drink_window_start: 2000, drink_window_end: 2030, grapes: ['Merlot'] },
          { id: 'drunken', quantity: 0, price: 100, drink_window_start: 2000, drink_window_end: 2030, grapes: ['Pinot Noir'] },
        ],
        error: null,
      }),
    )
    mockClient.setTable('stock_movements', makeQueryBuilder({ data: [], error: null }))

    const { result } = renderHookWithProviders(() => useDashboardStats())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const stats = result.current.data!
    expect(stats.totalWines).toBe(1)
    expect(stats.totalBottles).toBe(2)
    expect(stats.totalValue).toBe(60)
    expect(stats.readyToDrink).toBe(1)
    expect(stats.topGrapes.map((g) => g.grape)).toEqual(['Merlot'])
  })

  it('builds a monthly consumption series that ends at the current bottle count', async () => {
    mockClient.setTable(
      'wines',
      makeQueryBuilder({
        data: [{ id: 'a', quantity: 5, price: 0, grapes: [] }],
        error: null,
      }),
    )
    mockClient.setTable(
      'stock_movements',
      makeQueryBuilder({
        data: [
          { movement_date: '2026-01-15', movement_type: 'in', quantity: 4 },
          { movement_date: '2026-02-15', movement_type: 'out', quantity: 2 },
          { movement_date: '2026-03-15', movement_type: 'in', quantity: 3 },
        ],
        error: null,
      }),
    )

    const { result } = renderHookWithProviders(() => useDashboardStats())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const series = result.current.data!.consumptionData
    expect(series.map((p) => p.date)).toEqual(['2026-01', '2026-02', '2026-03'])
    // Final point reconciles with current inventory (5).
    expect(series[series.length - 1].count).toBe(5)
    // Net delta is 4 - 2 + 3 = 5; initial count 5 - 5 = 0; running 0+4=4, 4-2=2, 2+3=5.
    expect(series.map((p) => p.count)).toEqual([4, 2, 5])
  })
})
