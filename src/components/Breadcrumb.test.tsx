import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { ReactNode } from 'react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

const renderWithProvider = (ui: ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>)

describe('Breadcrumb', () => {
  it('renders linkable items as anchors and the current page as plain text', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', to: '/' },
      { label: 'Wines', to: '/wines' },
      { label: 'Barolo', to: undefined },
    ]
    renderWithProvider(<Breadcrumb items={items} />)

    const home = screen.getByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('href', '/')

    const wines = screen.getByRole('link', { name: 'Wines' })
    expect(wines).toHaveAttribute('href', '/wines')

    const current = screen.getByText('Barolo')
    expect(current.tagName).not.toBe('A')
  })

  it('handles empty items list', () => {
    renderWithProvider(<Breadcrumb items={[]} />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
