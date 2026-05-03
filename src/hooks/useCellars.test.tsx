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
import { useCellars, useAddCellar } from './useCellars'

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

describe('useCellars', () => {
  it('returns rows ordered by name', async () => {
    const builder = makeQueryBuilder({
      data: [{ id: 'c-1', name: 'Main' }],
      error: null,
    })
    mockClient.setTable('cellars', builder)

    const { result } = renderHookWithProviders(() => useCellars())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'c-1', name: 'Main' }])
    expect(builder.order).toHaveBeenCalledWith('name', { ascending: true })
  })
})

describe('useAddCellar', () => {
  it('adds a cellar with user_id and invalidates the cache', async () => {
    const inserted = { id: 'c-1', name: 'New', user_id: 'test-user-id' }
    mockClient.setTable('cellars', makeQueryBuilder({ data: inserted, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useAddCellar())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const out = await result.current.mutateAsync({ name: 'New' })
    expect(out).toEqual(inserted)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cellars'] })
    expect(showMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }))
  })

  it('throws when there is no authenticated user', async () => {
    mockClient.authGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const { result } = renderHookWithProviders(() => useAddCellar())
    await expect(result.current.mutateAsync({ name: 'X' })).rejects.toThrow(
      'Not authenticated',
    )
  })
})
