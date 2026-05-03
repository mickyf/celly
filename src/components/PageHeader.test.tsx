import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

const historyBackMock = vi.fn()
const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ history: { back: historyBackMock } }),
  useNavigate: () => navigateMock,
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders breadcrumbs, title and actions', () => {
    renderWithProviders(
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Wines', to: '/wines' },
          { label: 'Barolo', to: undefined },
        ]}
        title={<h1>Barolo</h1>}
        actions={<button>Edit</button>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Barolo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Wines' })).toHaveAttribute('href', '/wines')
  })

  it('calls custom onBack when provided', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    historyBackMock.mockClear()

    renderWithProviders(
      <PageHeader breadcrumbs={[{ label: 'Home', to: '/' }]} onBack={onBack} />,
    )

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(historyBackMock).not.toHaveBeenCalled()
  })

  it('falls back to router history.back when there is browser history', async () => {
    const user = userEvent.setup()
    historyBackMock.mockClear()
    navigateMock.mockClear()
    Object.defineProperty(window.history, 'length', { configurable: true, value: 5 })

    renderWithProviders(
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Wines', to: '/wines' },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(historyBackMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('navigates to the parent breadcrumb when there is no browser history', async () => {
    const user = userEvent.setup()
    historyBackMock.mockClear()
    navigateMock.mockClear()
    Object.defineProperty(window.history, 'length', { configurable: true, value: 1 })

    renderWithProviders(
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Wines', to: '/wines', search: { foo: 'bar' } },
          { label: 'Barolo', to: undefined },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(historyBackMock).not.toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith({ to: '/wines', search: { foo: 'bar' } })
  })
})
