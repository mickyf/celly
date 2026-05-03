import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { LanguageSelector } from './LanguageSelector'

describe('LanguageSelector', () => {
  it('renders the trigger with an accessible label', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getByLabelText(/change language/i)).toBeInTheDocument()
  })
})
