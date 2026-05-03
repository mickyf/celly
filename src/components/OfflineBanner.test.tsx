import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { OfflineBanner } from './OfflineBanner'

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

describe('OfflineBanner', () => {
  it('renders nothing when navigator is online', () => {
    setOnline(true)
    renderWithProviders(<OfflineBanner />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an alert when offline', () => {
    setOnline(false)
    renderWithProviders(<OfflineBanner />)
    // Reads from `common:offline.title` — assert the role rather than the text.
    expect(screen.getByRole('alert')).toBeInTheDocument()
    setOnline(true)
  })
})
