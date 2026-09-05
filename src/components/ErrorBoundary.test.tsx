import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { AppErrorBoundary } from './ErrorBoundary'

import type { ComponentType } from 'react'

// Passthrough stub. It deliberately does NOT simulate the fallback path: a
// try/catch around JSX cannot catch a render error (React renders later), so
// the previous version of this mock only looked like it tested error handling.
// Exercising the fallback needs a real error boundary, which Sentry provides in
// production and this suite doesn't currently cover.
vi.mock('@sentry/react', () => ({
  withErrorBoundary: <P extends object>(Component: ComponentType<P>) => Component,
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
