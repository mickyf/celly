import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

const deleteShelfMutate = vi.fn()
const unplaceWineMutate = vi.fn()
const addStockMovementMutate = vi.fn()

vi.mock('../hooks/useWineLocations', () => ({
  useDeleteShelf: () => ({ mutate: deleteShelfMutate, isPending: false }),
  useUnplaceWine: () => ({ mutate: unplaceWineMutate, isPending: false }),
}))

vi.mock('../hooks/useStockMovements', () => ({
  useAddStockMovement: () => ({ mutate: addStockMovementMutate, isPending: false }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { CellarVisualizer } from './CellarVisualizer'
import type { SlotWithWine } from '../hooks/useWineLocations'

const slot = (overrides: Partial<SlotWithWine>): SlotWithWine =>
  ({
    id: 's-1',
    cellar_id: 'c-1',
    user_id: 'u',
    wine_id: null,
    shelf: 1,
    row: 1,
    column: 1,
    quantity: null,
    created_at: null,
    updated_at: null,
    cellar: { name: 'Main' },
    wine: null,
    ...overrides,
  }) as SlotWithWine

describe('CellarVisualizer', () => {
  it('renders the empty state and an add-shelf button when there are no shelves', async () => {
    const user = userEvent.setup()
    const onAddShelf = vi.fn()

    renderWithProviders(
      <CellarVisualizer
        cellarId="c-1"
        slots={[]}
        onAddShelf={onAddShelf}
        onSlotClick={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add shelf/i }))
    expect(onAddShelf).toHaveBeenCalledTimes(1)
  })

  it('renders an occupancy badge per shelf (occupied/total)', () => {
    renderWithProviders(
      <CellarVisualizer
        cellarId="c-1"
        slots={[
          slot({ id: 's-1', shelf: 1, row: 1, column: 1, wine_id: 'w-1', wine: { id: 'w-1', name: 'A', vintage: 2020, grapes: ['Merlot'] } as never }),
          slot({ id: 's-2', shelf: 1, row: 1, column: 2 }),
          slot({ id: 's-3', shelf: 1, row: 2, column: 1 }),
        ]}
        onAddShelf={vi.fn()}
        onSlotClick={vi.fn()}
      />,
    )

    // 1 occupied / 3 slots → badge shows "1 / 3"
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('disables the delete button when the shelf still has occupied slots', () => {
    renderWithProviders(
      <CellarVisualizer
        cellarId="c-1"
        slots={[
          slot({ id: 's-1', wine_id: 'w-1', wine: { id: 'w-1', name: 'X', vintage: 2020, grapes: [] } as never }),
        ]}
        onAddShelf={vi.fn()}
        onSlotClick={vi.fn()}
      />,
    )

    // Deletion is forbidden while wines are still placed.
    const deleteButton = screen.getByRole('button', { name: /delete shelf/i })
    expect(deleteButton).toBeDisabled()
  })

  it('opens a confirm modal and calls deleteShelf with the right shelf number', async () => {
    const user = userEvent.setup()
    deleteShelfMutate.mockClear()

    renderWithProviders(
      <CellarVisualizer
        cellarId="c-1"
        slots={[slot({ id: 's-1', shelf: 2 })]}
        onAddShelf={vi.fn()}
        onSlotClick={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /delete shelf/i }))
    // The modal is open; click its Delete confirm button (last on screen).
    const confirmButtons = screen.getAllByRole('button', { name: /^delete$/i })
    await user.click(confirmButtons[confirmButtons.length - 1])

    expect(deleteShelfMutate).toHaveBeenCalledWith({ cellarId: 'c-1', shelf: 2 })
  })

  it('renders the edit-shelf affordance with the correct shelf number', async () => {
    const user = userEvent.setup()
    const onEditShelf = vi.fn()

    renderWithProviders(
      <CellarVisualizer
        cellarId="c-1"
        slots={[slot({ id: 's-1', shelf: 5, row: 1, column: 1 })]}
        onAddShelf={vi.fn()}
        onSlotClick={vi.fn()}
        onEditShelf={onEditShelf}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(onEditShelf).toHaveBeenCalledWith(5)
  })
})
