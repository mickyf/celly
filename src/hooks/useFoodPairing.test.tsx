import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseMock } from '../test/supabaseMock'

vi.mock('../lib/supabase', async () => {
  const { getSupabaseMock } = await import('../test/supabaseMock')
  return { supabase: getSupabaseMock().supabase }
})

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  startSpan: <T,>(_opts: unknown, fn: (span: { setStatus: () => void }) => T) =>
    fn({ setStatus: vi.fn() }),
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
import { useFoodPairing } from './useFoodPairing'

const mockClient = getSupabaseMock()

const wine = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'w-1',
    name: 'Barolo',
    vintage: 2018,
    grapes: ['Nebbiolo'],
    quantity: 2,
    price: 80,
    bottle_size: '75cl',
    drink_window_start: 2025,
    drink_window_end: 2030,
    food_pairings: null,
    photo_url: null,
    user_id: 'u',
    winery_id: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }) as never

beforeEach(() => {
  mockClient.functionsInvoke.mockReset()
})

describe('useFoodPairing', () => {
  it('throws before calling claude when there are no wines', async () => {
    const { result } = renderHookWithProviders(() => useFoodPairing())
    await expect(
      result.current.mutateAsync({ menu: 'risotto', wines: [] }),
    ).rejects.toThrow(/no wines/i)
    expect(mockClient.functionsInvoke).not.toHaveBeenCalled()
  })

  it('forwards menu, wine subset and language to the edge function and returns its result', async () => {
    const recommendation = {
      recommendations: [
        {
          wineId: 'w-1',
          wineName: 'Barolo',
          vintage: 2018,
          grapes: ['Nebbiolo'],
          rank: 1,
          pairingScore: 95,
          explanation: 'Classic.',
        },
      ],
    }
    mockClient.functionsInvoke.mockResolvedValueOnce({
      data: recommendation,
      error: null,
    })

    const { result } = renderHookWithProviders(() => useFoodPairing())
    const out = await result.current.mutateAsync({
      menu: 'risotto al tartufo',
      wines: [wine()],
      language: 'en',
    })

    expect(out).toEqual(recommendation)
    expect(mockClient.functionsInvoke).toHaveBeenCalledWith(
      'claude-proxy',
      expect.objectContaining({
        body: expect.objectContaining({
          type: 'food-pairing',
          menu: 'risotto al tartufo',
          language: 'en',
          availableWines: [
            {
              id: 'w-1',
              name: 'Barolo',
              vintage: 2018,
              grapes: ['Nebbiolo'],
              quantity: 2,
              price: 80,
            },
          ],
        }),
      }),
    )
  })

  it('throws when the edge function returns an error', async () => {
    mockClient.functionsInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'upstream timeout' },
    })

    const { result } = renderHookWithProviders(() => useFoodPairing())
    await expect(
      result.current.mutateAsync({ menu: 'x', wines: [wine()] }),
    ).rejects.toThrow('upstream timeout')
  })
})
