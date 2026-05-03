import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import { AuthSplash } from './AuthSplash'

describe('AuthSplash', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<AuthSplash />)
    expect(container.querySelector('[class*="Loader"]')).toBeInTheDocument()
  })
})
