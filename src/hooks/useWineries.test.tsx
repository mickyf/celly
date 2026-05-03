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

const showMock = vi.fn()
vi.mock('@mantine/notifications', async () => {
  const actual = await vi.importActual<typeof import('@mantine/notifications')>(
    '@mantine/notifications',
  )
  return {
    ...actual,
    notifications: { ...actual.notifications, show: (...a: unknown[]) => showMock(...a) },
  }
})

import { renderHookWithProviders } from '../test/renderHookWithProviders'
import {
  useWineries,
  useWinery,
  useWineryWineCount,
  useAddWinery,
  useDeleteWinery,
  useMergeWineries,
} from './useWineries'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.fromMock.mockClear()
  mockClient.authGetUser.mockClear()
  mockClient.authGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 't@e.com' } },
    error: null,
  })
  showMock.mockClear()
})

describe('useWineries', () => {
  it('returns the rows and orders by name', async () => {
    const rows = [{ id: 'a', name: 'Alpha', country_code: 'FR' }]
    const wineriesBuilder = makeQueryBuilder({ data: rows, error: null })
    mockClient.setTable('wineries', wineriesBuilder)

    const { result } = renderHookWithProviders(() => useWineries())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(rows)
    expect(wineriesBuilder.order).toHaveBeenCalledWith('name', { ascending: true })
  })
})

describe('useWinery', () => {
  it('is disabled when id is empty', () => {
    const { result } = renderHookWithProviders(() => useWinery(''))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches a single winery by id', async () => {
    const row = { id: 'wy-1', name: 'A' }
    mockClient.setTable('wineries', makeQueryBuilder({ data: row, error: null }))
    const { result } = renderHookWithProviders(() => useWinery('wy-1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(row)
  })
})

describe('useWineryWineCount', () => {
  it('returns the count from the head query', async () => {
    mockClient.setTable('wines', makeQueryBuilder({ count: 7, error: null }))
    const { result } = renderHookWithProviders(() => useWineryWineCount('wy-1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(7)
  })

  it('coerces null to 0', async () => {
    mockClient.setTable('wines', makeQueryBuilder({ count: null, error: null }))
    const { result } = renderHookWithProviders(() => useWineryWineCount('wy-1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(0)
  })
})

describe('useAddWinery', () => {
  it('adds user_id from auth and invalidates the wineries cache', async () => {
    const inserted = { id: 'new', name: 'X', user_id: 'test-user-id' }
    mockClient.setTable('wineries', makeQueryBuilder({ data: inserted, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useAddWinery())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const out = await result.current.mutateAsync({ name: 'X', country_code: 'FR' })
    expect(out).toEqual(inserted)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wineries'] })
    expect(showMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }))
  })
})

describe('useDeleteWinery', () => {
  it('refuses to delete a winery that still has wines', async () => {
    // wines table is queried first for count, then wineries.delete (not reached)
    mockClient.setTable('wines', makeQueryBuilder({ count: 3, error: null }))
    mockClient.setTable('wineries', makeQueryBuilder({ data: null, error: null }))

    const { result } = renderHookWithProviders(() => useDeleteWinery())
    await expect(result.current.mutateAsync('wy-1')).rejects.toThrow()
  })

  it('deletes when count is 0', async () => {
    mockClient.setTable('wines', makeQueryBuilder({ count: 0, error: null }))
    mockClient.setTable('wineries', makeQueryBuilder({ data: null, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useDeleteWinery())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync('wy-1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wineries'] })
  })
})

describe('useMergeWineries', () => {
  it('refuses to merge a winery with itself', async () => {
    const { result } = renderHookWithProviders(() => useMergeWineries())
    await expect(
      result.current.mutateAsync({ sourceId: 'a', targetId: 'a' }),
    ).rejects.toThrow()
  })

  it('returns the moved wine count and invalidates caches', async () => {
    mockClient.setTable('wines', makeQueryBuilder({ count: 4, error: null }))
    mockClient.setTable('wineries', makeQueryBuilder({ data: null, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useMergeWineries())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const out = await result.current.mutateAsync({ sourceId: 'a', targetId: 'b' })
    expect(out).toEqual({ movedWineCount: 4 })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wineries'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wines'] })
  })
})
