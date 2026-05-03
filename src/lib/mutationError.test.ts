import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TFunction } from 'i18next'

const showMock = vi.fn()
vi.mock('@mantine/notifications', () => ({
  notifications: { show: (...args: unknown[]) => showMock(...args) },
}))

const captureMock = vi.fn()
vi.mock('@sentry/react', () => ({
  captureException: (...args: unknown[]) => captureMock(...args),
}))

import { showMutationError } from './mutationError'

const t = ((key: string) => `[${key}]`) as unknown as TFunction

describe('showMutationError', () => {
  beforeEach(() => {
    showMock.mockClear()
    captureMock.mockClear()
  })

  it('captures the error in Sentry with a source tag', () => {
    const err = new Error('boom')
    showMutationError(t, err)
    expect(captureMock).toHaveBeenCalledWith(err, {
      tags: { source: 'mutation-error-handler' },
    })
  })

  it('shows a red notification with the translated title and the raw error message', () => {
    showMutationError(t, new Error('Network down'))
    expect(showMock).toHaveBeenCalledTimes(1)
    expect(showMock).toHaveBeenCalledWith({
      title: '[common:errors.toastTitle]',
      message: 'Network down',
      color: 'red',
      autoClose: 8000,
      withCloseButton: true,
    })
  })
})
