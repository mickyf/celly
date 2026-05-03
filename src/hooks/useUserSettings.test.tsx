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
  useUserSettings,
  useUserSetting,
  useUpdateUserSetting,
} from './useUserSettings'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.fromMock.mockClear()
  mockClient.authGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 't@e.com' } },
    error: null,
  })
  showMock.mockClear()
})

describe('useUserSettings', () => {
  it('returns an empty array when supabase returns null data', async () => {
    mockClient.setTable('user_settings', makeQueryBuilder({ data: null, error: null }))
    const { result } = renderHookWithProviders(() => useUserSettings())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

describe('useUserSetting', () => {
  it('returns the row matched by key (or null)', async () => {
    const row = { id: 's-1', key: 'theme', value: { mode: 'dark' } }
    mockClient.setTable('user_settings', makeQueryBuilder({ data: row, error: null }))

    const { result } = renderHookWithProviders(() => useUserSetting('theme'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(row)
  })
})

describe('useUpdateUserSetting', () => {
  it('upserts the setting with the user id and invalidates both caches', async () => {
    const row = { id: 's-1', key: 'theme', value: { mode: 'dark' } }
    const builder = makeQueryBuilder({ data: row, error: null })
    mockClient.setTable('user_settings', builder)

    const { result, queryClient } = renderHookWithProviders(() => useUpdateUserSetting())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync({ key: 'theme', value: { mode: 'dark' } })

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'theme', user_id: 'test-user-id' }),
      { onConflict: 'user_id,key' },
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['user_settings', 'theme'] })
  })

  it('throws when there is no authenticated user', async () => {
    mockClient.authGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const { result } = renderHookWithProviders(() => useUpdateUserSetting())
    await expect(
      result.current.mutateAsync({ key: 'x', value: 1 }),
    ).rejects.toThrow('Not authenticated')
  })
})
