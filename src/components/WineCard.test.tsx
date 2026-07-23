import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const photoUrlMock = vi.fn(() => ({ data: undefined as string | undefined }))
vi.mock('../hooks/useWinePhotoUrl', () => ({
  useWinePhotoUrl: () => photoUrlMock(),
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { WineCard } from './WineCard'

import type { Database } from '../types/database'
type Wine = Database['public']['Tables']['wines']['Row']

const baseWine: Wine = {
  id: 'w-1',
  name: 'Barolo',
  vintage: 2018,
  wine_type: 'red',
  grapes: ['Nebbiolo'],
  quantity: 3,
  price: 80,
  bottle_size: '75cl',
  drink_window_start: 2025,
  drink_window_end: 2030,
  food_pairings: null,
  photo_url: 'user-1/w-1.jpg',
  user_id: 'u',
  winery_id: null,
  created_at: null,
  updated_at: null,
  import_batch_id: null,
}

describe('WineCard', () => {
  it('shows the placeholder icon when no signed photo URL is available', () => {
    photoUrlMock.mockReturnValueOnce({ data: undefined })
    renderWithProviders(<WineCard wine={{ ...baseWine }} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('shows the image when a signed photo URL is returned', () => {
    photoUrlMock.mockReturnValueOnce({ data: 'https://signed/x.jpg' })
    renderWithProviders(<WineCard wine={{ ...baseWine }} />)
    const img = screen.getByRole('img', { name: 'Barolo' })
    expect(img).toHaveAttribute('src', 'https://signed/x.jpg')
  })

  it('renders the "ready" badge when the current year is inside the drink window', () => {
    photoUrlMock.mockReturnValueOnce({ data: undefined })
    // current test date (CLAUDE memory: 2026-05-03), wine window 2025–2030 → ready.
    renderWithProviders(<WineCard wine={{ ...baseWine }} />)
    expect(screen.getByText(/ready/i)).toBeInTheDocument()
  })

  it('omits the "ready" badge when the wine is in the future', () => {
    photoUrlMock.mockReturnValueOnce({ data: undefined })
    renderWithProviders(
      <WineCard
        wine={{ ...baseWine, drink_window_start: 2040, drink_window_end: 2050 }}
      />,
    )
    expect(screen.queryByText(/^ready/i)).toBeNull()
  })

  it('passes the wine id to onDelete and fires onView/onEdit callbacks', async () => {
    photoUrlMock.mockReturnValue({ data: undefined })
    const user = userEvent.setup()
    const onView = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <WineCard
        wine={{ ...baseWine }}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    )

    // The card exposes two viewDetails affordances (photo wrapper + footer button).
    const detailButtons = screen.getAllByRole('button', { name: /^details$/i })
    await user.click(detailButtons[detailButtons.length - 1])
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(onView).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('w-1')
  })

  it('renders winery and grape badges when provided', () => {
    photoUrlMock.mockReturnValueOnce({ data: undefined })
    renderWithProviders(
      <WineCard
        wine={{ ...baseWine, grapes: ['Nebbiolo', 'Barbera'] }}
        winery={{
          id: 'wy-1',
          name: 'Cantina Test',
          country_code: 'IT',
          user_id: 'u',
          created_at: null,
          updated_at: null,
        }}
      />,
    )
    expect(screen.getByText('Cantina Test')).toBeInTheDocument()
    expect(screen.getByText('Nebbiolo')).toBeInTheDocument()
    expect(screen.getByText('Barbera')).toBeInTheDocument()
  })
})
