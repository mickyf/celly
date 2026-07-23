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
  startSpan: <T,>(
    _opts: unknown,
    fn: (span: { setStatus: () => void; setAttribute: () => void }) => T,
  ) => fn({ setStatus: vi.fn(), setAttribute: vi.fn() }),
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

import { renderHookWithProviders } from '../test/renderHookWithProviders'
import { useBulkImportWines, type ImportRow } from './useOrderImport'

const mockClient = getSupabaseMock()

const winery = (id: string, name: string) => ({ id, name })

function row(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    rowId: 'r-' + Math.random().toString(36).slice(2, 8),
    included: true,
    existingWineId: null,
    name: 'Some Wine',
    wineType: null,
    vintage: 2020,
    quantity: 6,
    price: null,
    bottleSize: '75cl',
    winery: null,
    ...overrides,
  }
}

beforeEach(() => {
  mockClient.fromMock.mockClear()
})

describe('useBulkImportWines', () => {
  it('inserts new wines, restocks matches, and stamps both with the same batch id', async () => {
    const winesBuilder = makeQueryBuilder<{ id: string; name: string }[]>({
      data: [{ id: 'new-w-1', name: 'New Wine A' }],
      error: null,
    })
    const stockBuilder = makeQueryBuilder<{ id: string }[]>({
      data: [{ id: 'sm-1' }],
      error: null,
    })

    mockClient.setTable('wines', winesBuilder)
    mockClient.setTable('stock_movements', stockBuilder)

    const { result } = renderHookWithProviders(() => useBulkImportWines())

    const rows: ImportRow[] = [
      row({
        included: true,
        existingWineId: null,
        name: 'New Wine A',
        winery: { existingId: 'wy-1', newName: null, newCountryCode: null },
      }),
      row({
        included: true,
        existingWineId: 'existing-wine-id',
        name: 'Old Wine',
        winery: null,
      }),
      row({ included: false, name: 'Skip Me' }),
    ]

    const summary = await result.current.mutateAsync({
      rows,
      existingWineries: [winery('wy-1', 'Existing Winery')],
    })

    expect(summary.created).toBe(1)
    expect(summary.restocked).toBe(1)
    expect(summary.skipped).toBe(1)
    expect(summary.failures).toEqual([])
    expect(summary.batchId).toMatch(/^[0-9a-f-]{36}$/i)

    const wineInsertArg = winesBuilder.insert.mock.calls[0][0] as Array<{
      import_batch_id: string
      winery_id: string | null
    }>
    expect(wineInsertArg).toHaveLength(1)
    expect(wineInsertArg[0].import_batch_id).toBe(summary.batchId)
    expect(wineInsertArg[0].winery_id).toBe('wy-1')

    const stockInsertArg = stockBuilder.insert.mock.calls[0][0] as Array<{
      import_batch_id: string
      wine_id: string
      movement_type: string
    }>
    expect(stockInsertArg).toHaveLength(1)
    expect(stockInsertArg[0].import_batch_id).toBe(summary.batchId)
    expect(stockInsertArg[0].wine_id).toBe('existing-wine-id')
    expect(stockInsertArg[0].movement_type).toBe('in')
  })

  it('creates each new winery only once even when multiple rows reference it', async () => {
    const wineriesBuilder = makeQueryBuilder<{ id: string; name: string }[]>({
      data: [{ id: 'new-wy-1', name: 'Brand New Producer' }],
      error: null,
    })
    const winesBuilder = makeQueryBuilder<{ id: string; name: string }[]>({
      data: [
        { id: 'nw-1', name: 'Wine 1' },
        { id: 'nw-2', name: 'Wine 2' },
      ],
      error: null,
    })

    mockClient.setTable('wineries', wineriesBuilder)
    mockClient.setTable('wines', winesBuilder)

    const { result } = renderHookWithProviders(() => useBulkImportWines())

    const sharedWinery = {
      existingId: null,
      newName: 'Brand New Producer',
      newCountryCode: 'IT',
    }
    const rows: ImportRow[] = [
      row({ name: 'Wine 1', winery: { ...sharedWinery } }),
      row({ name: 'Wine 2', winery: { ...sharedWinery } }),
      row({
        name: 'Wine 3',
        winery: { ...sharedWinery, newName: 'BRAND new producer' },
      }),
    ]

    await result.current.mutateAsync({ rows, existingWineries: [] })

    expect(wineriesBuilder.insert).toHaveBeenCalledTimes(1)
    const inserts = wineriesBuilder.insert.mock.calls[0][0] as unknown[]
    expect(inserts).toHaveLength(1)
  })

  it('fuzzy-matches an existing winery (via Fuse) instead of creating a new one', async () => {
    const winesBuilder = makeQueryBuilder<{ id: string; name: string }[]>({
      data: [{ id: 'nw-1', name: 'New Wine' }],
      error: null,
    })
    const wineriesBuilder = makeQueryBuilder({ data: [], error: null })

    mockClient.setTable('wines', winesBuilder)
    mockClient.setTable('wineries', wineriesBuilder)

    const { result } = renderHookWithProviders(() => useBulkImportWines())

    await result.current.mutateAsync({
      rows: [
        row({
          name: 'New Wine',
          winery: { existingId: null, newName: 'Chateau Margaux', newCountryCode: 'FR' },
        }),
      ],
      existingWineries: [winery('wy-existing', 'Château Margaux')],
    })

    expect(wineriesBuilder.insert).not.toHaveBeenCalled()
    const wineInsert = winesBuilder.insert.mock.calls[0][0] as Array<{ winery_id: string | null }>
    expect(wineInsert[0].winery_id).toBe('wy-existing')
  })

  it('counts unchecked rows as skipped without inserting them', async () => {
    const winesBuilder = makeQueryBuilder({ data: [], error: null })
    const stockBuilder = makeQueryBuilder({ data: [], error: null })
    mockClient.setTable('wines', winesBuilder)
    mockClient.setTable('stock_movements', stockBuilder)

    const { result } = renderHookWithProviders(() => useBulkImportWines())

    const summary = await result.current.mutateAsync({
      rows: [
        row({ included: false, name: 'Ignore me' }),
        row({ included: false, existingWineId: 'old', name: 'Ignore restock too' }),
      ],
      existingWineries: [],
    })

    expect(summary.skipped).toBe(2)
    expect(summary.created).toBe(0)
    expect(summary.restocked).toBe(0)
    expect(winesBuilder.insert).not.toHaveBeenCalled()
    expect(stockBuilder.insert).not.toHaveBeenCalled()
  })

  it('records partial failures without throwing', async () => {
    const winesBuilder = makeQueryBuilder<{ id: string; name: string }[]>({
      data: null,
      error: { message: 'simulated wines.insert failure' },
    })
    const stockBuilder = makeQueryBuilder<{ id: string }[]>({
      data: [{ id: 'sm-1' }],
      error: null,
    })

    mockClient.setTable('wines', winesBuilder)
    mockClient.setTable('stock_movements', stockBuilder)

    const { result } = renderHookWithProviders(() => useBulkImportWines())

    const summary = await result.current.mutateAsync({
      rows: [
        row({ name: 'Wine that will fail', winery: null }),
        row({ existingWineId: 'old-wine', name: 'Old', winery: null }),
      ],
      existingWineries: [],
    })

    expect(summary.created).toBe(0)
    expect(summary.restocked).toBe(1)
    expect(summary.failures).toHaveLength(1)
    expect(summary.failures[0].error).toMatch(/simulated/)
  })

  it('throws when the user is not authenticated', async () => {
    mockClient.authGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const { result } = renderHookWithProviders(() => useBulkImportWines())
    await waitFor(() => expect(result.current).toBeTruthy())
    await expect(
      result.current.mutateAsync({
        rows: [row()],
        existingWineries: [],
      }),
    ).rejects.toThrow()
  })
})
