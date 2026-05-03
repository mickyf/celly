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
  useTastingNotes,
  useAddTastingNote,
  useUpdateTastingNote,
  useDeleteTastingNote,
} from './useTastingNotes'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.fromMock.mockClear()
  mockClient.authGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 't@e.com' } },
    error: null,
  })
  showMock.mockClear()
})

describe('useTastingNotes', () => {
  it('is disabled until a wineId is provided', () => {
    const { result } = renderHookWithProviders(() => useTastingNotes())
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('filters by wineId when provided', async () => {
    const builder = makeQueryBuilder({ data: [{ id: 'n-1' }], error: null })
    mockClient.setTable('tasting_notes', builder)

    const { result } = renderHookWithProviders(() => useTastingNotes('w-1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.eq).toHaveBeenCalledWith('wine_id', 'w-1')
  })
})

describe('useAddTastingNote', () => {
  it('attaches user_id and invalidates the per-wine cache', async () => {
    const inserted = { id: 'n-1', wine_id: 'w-1' }
    mockClient.setTable('tasting_notes', makeQueryBuilder({ data: inserted, error: null }))

    const { result, queryClient } = renderHookWithProviders(() => useAddTastingNote())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync({ wine_id: 'w-1', rating: 4, user_id: '' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasting_notes', 'w-1'] })
  })
})

describe('useUpdateTastingNote', () => {
  it('returns the updated row', async () => {
    const updated = { id: 'n-1', wine_id: 'w-1', rating: 5 }
    mockClient.setTable('tasting_notes', makeQueryBuilder({ data: updated, error: null }))

    const { result } = renderHookWithProviders(() => useUpdateTastingNote())
    const out = await result.current.mutateAsync({ id: 'n-1', rating: 5 })
    expect(out).toEqual(updated)
  })
})

describe('useDeleteTastingNote', () => {
  it('returns wineId on success', async () => {
    mockClient.setTable('tasting_notes', makeQueryBuilder({ data: null, error: null }))

    const { result } = renderHookWithProviders(() => useDeleteTastingNote())
    const out = await result.current.mutateAsync({ id: 'n-1', wineId: 'w-1' })
    expect(out).toBe('w-1')
  })
})
