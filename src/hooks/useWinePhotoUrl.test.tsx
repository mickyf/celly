import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { getSupabaseMock } from '../test/supabaseMock'

vi.mock('../lib/supabase', async () => {
  const { getSupabaseMock } = await import('../test/supabaseMock')
  return { supabase: getSupabaseMock().supabase }
})

import { renderHookWithProviders } from '../test/renderHookWithProviders'
import { useWinePhotoUrl } from './useWinePhotoUrl'

const mockClient = getSupabaseMock()

beforeEach(() => {
  mockClient.storageFromMock.mockClear()
})

describe('useWinePhotoUrl', () => {
  it('is disabled when there is no stored value', () => {
    const { result } = renderHookWithProviders(() => useWinePhotoUrl(null))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('is disabled for an empty string', () => {
    const { result } = renderHookWithProviders(() => useWinePhotoUrl(''))
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('returns the signed URL for a stored bucket path', async () => {
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: 'https://signed/example.jpg' },
      error: null,
    }))
    mockClient.storageFromMock.mockReturnValueOnce({
      createSignedUrl,
      upload: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      list: vi.fn(),
    })

    const { result } = renderHookWithProviders(() => useWinePhotoUrl('user-1/wine-1.jpg'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('https://signed/example.jpg')
    expect(createSignedUrl).toHaveBeenCalledWith('user-1/wine-1.jpg', 60 * 60)
    expect(mockClient.storageFromMock).toHaveBeenCalledWith('wine-images')
  })

  it('throws when Supabase storage returns an error', async () => {
    mockClient.storageFromMock.mockReturnValueOnce({
      createSignedUrl: vi.fn(async () => ({
        data: null,
        error: { message: 'gone' },
      })),
      upload: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
      list: vi.fn(),
    })

    const { result } = renderHookWithProviders(() => useWinePhotoUrl('user-1/wine-1.jpg'))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('gone')
  })
})
