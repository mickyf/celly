import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { AppErrorBoundary } from './ErrorBoundary'

import type { ComponentType } from 'react'

interface FallbackProps {
  error: unknown
  componentStack: string
  eventId: string
  resetError: () => void
}

vi.mock('@sentry/react', () => ({
  withErrorBoundary:
    <P extends object>(
      Component: ComponentType<P>,
      opts: { fallback: ComponentType<FallbackProps> },
    ) => {
      const Boundary = (props: P) => {
        try {
          return <Component {...props} />
        } catch (error) {
          const Fallback = opts.fallback
          return (
            <Fallback
              error={error}
              componentStack=""
              eventId=""
              resetError={() => {}}
            />
          )
        }
      }
      return Boundary
    },
}))

describe('AppErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    renderWithProviders(
      <AppErrorBoundary>
        <span>OK</span>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('OK')).toBeInTheDocument()
  })
})
