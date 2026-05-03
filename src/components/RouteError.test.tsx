import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

const captureMock = vi.fn()
vi.mock('@sentry/react', () => ({
  captureException: (...args: unknown[]) => captureMock(...args),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { RouteError } from './RouteError'

describe('RouteError', () => {
  it('captures the error in Sentry on mount', () => {
    captureMock.mockClear()
    const err = new Error('boom')
    renderWithProviders(<RouteError error={err} />)
    expect(captureMock).toHaveBeenCalledWith(err, {
      tags: { source: 'route-error-boundary' },
    })
  })

  it('renders the retry button only when reset is provided', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()

    renderWithProviders(<RouteError error={new Error('x')} reset={reset} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    await user.click(buttons[0])
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('always renders a link back to home', () => {
    renderWithProviders(<RouteError error={new Error('x')} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/')
  })
})
