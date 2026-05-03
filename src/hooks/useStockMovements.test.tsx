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
  useStockMovements,
  useAddStockMovement,
  useUpdateStockMovement,
  useDeleteStockMovement,
} from './useStockMovements'

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

describe('useStockMovements', () => {
  it('lists all movements when no wineId is given', async () => {
    const builder = makeQueryBuilder({ data: [{ id: 'm-1' }], error: null })
    mockClient.setTable('stock_movements', builder)

    const { result } = renderHookWithProviders(() => useStockMovements())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.eq).not.toHaveBeenCalled()
  })

  it('filters by wineId when provided', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    mockClient.setTable('stock_movements', builder)

    const { result } = renderHookWithProviders(() => useStockMovements('w-1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.eq).toHaveBeenCalledWith('wine_id', 'w-1')
  })
})

describe('useAddStockMovement', () => {
  it('optimistically updates wine quantity for "in" movements', async () => {
    const inserted = { id: 'm-1', wine_id: 'w-1' }
    mockClient.setTable('stock_movements', makeQueryBuilder({ data: inserted, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useAddStockMovement())
    queryClient.setQueryData(['wines'], [{ id: 'w-1', quantity: 5 }])

    await result.current.mutateAsync({
      wine_id: 'w-1',
      movement_type: 'in',
      quantity: 3,
      user_id: '',
    })

    expect(
      (queryClient.getQueryData(['wines']) as { id: string; quantity: number }[])[0]
        .quantity,
    ).toBe(8)
  })

  it('rolls back the optimistic update when the mutation fails', async () => {
    mockClient.setTable(
      'stock_movements',
      makeQueryBuilder({ data: null, error: { message: 'fail' } }),
    )

    const { result, queryClient } = renderHookWithProviders(() => useAddStockMovement())
    const original = [{ id: 'w-1', quantity: 5 }]
    queryClient.setQueryData(['wines'], original)

    await expect(
      result.current.mutateAsync({
        wine_id: 'w-1',
        movement_type: 'out',
        quantity: 2,
        user_id: '',
      }),
    ).rejects.toThrow()

    expect(queryClient.getQueryData(['wines'])).toEqual(original)
  })
})

describe('useUpdateStockMovement', () => {
  it('returns the updated row and invalidates the right caches', async () => {
    const updated = { id: 'm-1', wine_id: 'w-1' }
    mockClient.setTable('stock_movements', makeQueryBuilder({ data: updated, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useUpdateStockMovement())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync({ id: 'm-1', quantity: 5 })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['stock_movements', 'w-1'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wines', 'w-1'] })
  })
})

describe('useDeleteStockMovement', () => {
  it('returns wineId on success and invalidates per-wine caches', async () => {
    mockClient.setTable('stock_movements', makeQueryBuilder({ data: null, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useDeleteStockMovement())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync({ id: 'm-1', wineId: 'w-1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wines', 'w-1'] })
  })
})
