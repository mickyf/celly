import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders message-only', () => {
    renderWithProviders(<EmptyState message="No wines yet" />)
    expect(screen.getByText('No wines yet')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders title and action button', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    renderWithProviders(
      <EmptyState
        title="Empty cellar"
        message="Add your first wine"
        actionLabel="Add wine"
        onAction={onAction}
      />,
    )

    expect(screen.getByText('Empty cellar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add wine' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('does not render the button when actionLabel is missing even if onAction is given', () => {
    renderWithProviders(<EmptyState message="x" onAction={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
