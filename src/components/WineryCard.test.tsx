import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { WineryCard } from './WineryCard'

const winery = {
  id: 'wy-1',
  name: 'Château Test',
  country_code: 'FR',
  user_id: 'u-1',
  created_at: null,
  updated_at: null,
}

describe('WineryCard', () => {
  it('renders the winery name and wine count', () => {
    renderWithProviders(<WineryCard winery={winery} wineCount={3} />)
    expect(screen.getByText('Château Test')).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('disables delete when there are still wines', () => {
    renderWithProviders(
      <WineryCard winery={winery} wineCount={3} onDelete={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
  })

  it('enables delete when there are no wines', () => {
    renderWithProviders(
      <WineryCard winery={winery} wineCount={0} onDelete={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /delete/i })).toBeEnabled()
  })

  it('hides the merge button when wineCount is 0', () => {
    renderWithProviders(
      <WineryCard winery={winery} wineCount={0} onMerge={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /merge/i })).toBeNull()
  })

  it('passes the winery id to onDelete and onView', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const onView = vi.fn()
    renderWithProviders(
      <WineryCard winery={winery} wineCount={0} onView={onView} onDelete={onDelete} />,
    )

    await user.click(screen.getByRole('button', { name: /^details$/i }))
    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(onView).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('wy-1')
  })
})
