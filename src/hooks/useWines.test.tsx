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
import { useWines, useDeleteWine, useAddWine } from './useWines'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.fromMock.mockClear()
  mockClient.authGetUser.mockClear()
  mockClient.authGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
    error: null,
  })
  showMock.mockClear()
})

describe('useWines (query)', () => {
  it('returns the rows fetched from supabase', async () => {
    const rows = [
      { id: 'a', name: 'Barolo' },
      { id: 'b', name: 'Chianti' },
    ]
    mockClient.setTable('wines', makeQueryBuilder({ data: rows, error: null }))

    const { result } = renderHookWithProviders(() => useWines())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(rows)
    expect(mockClient.fromMock).toHaveBeenCalledWith('wines')
  })

  it('throws and surfaces the error when supabase returns one', async () => {
    mockClient.setTable(
      'wines',
      makeQueryBuilder({ data: null, error: { message: 'boom' } }),
    )

    const { result } = renderHookWithProviders(() => useWines())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('boom')
  })
})

describe('useDeleteWine (mutation)', () => {
  it('invalidates the wines cache and shows a success notification', async () => {
    mockClient.setTable('wines', makeQueryBuilder({ data: null, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useDeleteWine())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync('w-1')

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['wines'] })
    expect(showMock).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'green' }),
    )
  })
})

describe('useAddWine (mutation with auth)', () => {
  it('attaches user_id from auth and returns the inserted row', async () => {
    const inserted = { id: 'new-id', name: 'Test', user_id: 'test-user-id' }
    mockClient.setTable('wines', makeQueryBuilder({ data: inserted, error: null }))

    const { result } = renderHookWithProviders(() => useAddWine())

    const out = await result.current.mutateAsync({ name: 'Test', user_id: '' })
    expect(out).toEqual(inserted)
    expect(mockClient.authGetUser).toHaveBeenCalled()
  })

  it('throws "Not authenticated" when there is no user', async () => {
    mockClient.authGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const { result } = renderHookWithProviders(() => useAddWine())

    await expect(
      result.current.mutateAsync({ name: 'Test', user_id: '' }),
    ).rejects.toThrow('Not authenticated')
  })
})
