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
import {
  useWineLocations,
  useCreateShelf,
  useAddSlots,
  useDeleteSlots,
  usePlaceWine,
  useUnplaceWine,
} from './useWineLocations'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.fromMock.mockClear()
  mockClient.authGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 't@e.com' } },
    error: null,
  })
})

describe('useWineLocations', () => {
  it('uses the wine-scoped key when wineId is provided', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    mockClient.setTable('wine_locations', builder)

    const { result } = renderHookWithProviders(() => useWineLocations('w-1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.eq).toHaveBeenCalledWith('wine_id', 'w-1')
  })

  it('filters by cellar when cellarId is provided', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    mockClient.setTable('wine_locations', builder)

    const { result } = renderHookWithProviders(() => useWineLocations(undefined, 'c-1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.eq).toHaveBeenCalledWith('cellar_id', 'c-1')
  })
})

describe('useCreateShelf', () => {
  it('inserts rows × columns slots', async () => {
    const builder = makeQueryBuilder({ data: null, error: null })
    mockClient.setTable('wine_locations', builder)

    const { result } = renderHookWithProviders(() => useCreateShelf())
    await result.current.mutateAsync({ cellarId: 'c-1', shelf: 1, rows: 2, columns: 3 })

    expect(builder.insert).toHaveBeenCalledTimes(1)
    const slots = builder.insert.mock.calls[0][0]
    expect(slots).toHaveLength(6)
    expect(slots[0]).toEqual({
      cellar_id: 'c-1',
      shelf: 1,
      row: 1,
      column: 1,
      user_id: 'test-user-id',
    })
    expect(slots[5]).toEqual({
      cellar_id: 'c-1',
      shelf: 1,
      row: 2,
      column: 3,
      user_id: 'test-user-id',
    })
  })
})

describe('useAddSlots', () => {
  it('inserts only the requested coordinates', async () => {
    const builder = makeQueryBuilder({ data: null, error: null })
    mockClient.setTable('wine_locations', builder)

    const { result } = renderHookWithProviders(() => useAddSlots())
    await result.current.mutateAsync({
      cellarId: 'c-1',
      shelf: 2,
      coords: [
        { row: 1, column: 1 },
        { row: 1, column: 5 },
      ],
    })

    expect(builder.insert).toHaveBeenCalledWith([
      { cellar_id: 'c-1', shelf: 2, row: 1, column: 1, user_id: 'test-user-id' },
      { cellar_id: 'c-1', shelf: 2, row: 1, column: 5, user_id: 'test-user-id' },
    ])
  })
})

describe('useDeleteSlots', () => {
  it('skips the call entirely when slotIds is empty', async () => {
    const builder = makeQueryBuilder({ data: null, error: null })
    mockClient.setTable('wine_locations', builder)

    const { result } = renderHookWithProviders(() => useDeleteSlots())
    await result.current.mutateAsync({ slotIds: [], cellarId: 'c-1' })
    expect(builder.delete).not.toHaveBeenCalled()
  })

  it('deletes by id and invalidates the cellar cache', async () => {
    const builder = makeQueryBuilder({ data: null, error: null })
    mockClient.setTable('wine_locations', builder)

    const { result, queryClient } = renderHookWithProviders(() => useDeleteSlots())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync({ slotIds: ['s-1', 's-2'], cellarId: 'c-1' })
    expect(builder.in).toHaveBeenCalledWith('id', ['s-1', 's-2'])
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['wine_locations', 'cellar', 'c-1'],
    })
  })
})

describe('usePlaceWine', () => {
  it('updates the slot with the wine_id and invalidates per-wine cache', async () => {
    const updated = { id: 's-1', wine_id: 'w-1', cellar_id: 'c-1' }
    const builder = makeQueryBuilder({ data: updated, error: null })
    mockClient.setTable('wine_locations', builder)

    const { result, queryClient } = renderHookWithProviders(() => usePlaceWine())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const out = await result.current.mutateAsync({ slotId: 's-1', wineId: 'w-1' })
    expect(out).toEqual(updated)
    expect(builder.update).toHaveBeenCalledWith({ wine_id: 'w-1' })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['wine_locations', 'wine', 'w-1'],
    })
  })
})

describe('useUnplaceWine', () => {
  it('clears wine_id on the slot', async () => {
    const updated = { id: 's-1', wine_id: null, cellar_id: 'c-1' }
    const builder = makeQueryBuilder({ data: updated, error: null })
    mockClient.setTable('wine_locations', builder)

    const { result } = renderHookWithProviders(() => useUnplaceWine())
    await result.current.mutateAsync({ slotId: 's-1' })
    expect(builder.update).toHaveBeenCalledWith({ wine_id: null })
  })
})
