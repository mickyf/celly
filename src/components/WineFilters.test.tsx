import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../hooks/useWineries', () => ({
  useWineries: () => ({
    data: [
      { id: 'wy-1', name: 'Alpha' },
      { id: 'wy-2', name: 'Beta' },
    ],
  }),
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { WineFilters, type WineFilterValues } from './WineFilters'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

const wine = (overrides: Partial<Wine> = {}): Wine =>
  ({
    id: 'w-1',
    name: 'Test',
    grapes: ['Merlot'],
    bottle_size: '75cl',
    vintage: 2018,
    price: 30,
    drink_window_start: 2025,
    drink_window_end: 2030,
    food_pairings: null,
    photo_url: null,
    quantity: 1,
    user_id: 'u',
    winery_id: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }) as Wine

const defaultFilters: WineFilterValues = {
  search: '',
  winery: null,
  grapes: [],
  bottleSizes: [],
  vintageMin: null,
  vintageMax: null,
  priceMin: null,
  priceMax: null,
  drinkingWindow: 'all',
  dataCompleteness: 'all',
}

describe('WineFilters', () => {
  it('renders chips for active filters and removing one fires onFiltersChange', async () => {
    const user = userEvent.setup()
    const onFiltersChange = vi.fn()

    renderWithProviders(
      <WineFilters
        wines={[wine()]}
        filters={{ ...defaultFilters, search: 'foo', vintageMin: 2018, vintageMax: 2022 }}
        onFiltersChange={onFiltersChange}
        activeFilterCount={2}
      />,
    )

    expect(screen.getByText(/foo/)).toBeInTheDocument()
    expect(screen.getByText(/2018.*2022/)).toBeInTheDocument()

    const removeButtons = screen.getAllByRole('button', { name: /remove filter/i })
    expect(removeButtons.length).toBeGreaterThanOrEqual(2)
    await user.click(removeButtons[0])
    expect(onFiltersChange).toHaveBeenCalledTimes(1)
  })

  it('renders no chips and hides the clear button when no filters are active', () => {
    renderWithProviders(
      <WineFilters
        wines={[wine()]}
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        activeFilterCount={0}
      />,
    )
    expect(screen.queryByRole('button', { name: /clear all/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull()
  })

  it('emits a filter change when the user types in the search box', async () => {
    const user = userEvent.setup()
    const onFiltersChange = vi.fn()

    renderWithProviders(
      <WineFilters
        wines={[wine()]}
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        activeFilterCount={0}
      />,
    )

    await user.type(screen.getByPlaceholderText(/search/i), 'a')
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'a' }),
    )
  })

  it('resets to default filters when "clear all" is clicked', async () => {
    const user = userEvent.setup()
    const onFiltersChange = vi.fn()

    renderWithProviders(
      <WineFilters
        wines={[wine()]}
        filters={{ ...defaultFilters, search: 'foo', vintageMin: 2018 }}
        onFiltersChange={onFiltersChange}
        activeFilterCount={2}
      />,
    )

    await user.click(screen.getByRole('button', { name: /clear all/i }))
    expect(onFiltersChange).toHaveBeenCalledWith(defaultFilters)
  })
})
