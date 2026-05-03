import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const updateMutateAsync = vi.fn(async () => ({}))
const deleteMutateAsync = vi.fn(async () => 'w-1')

vi.mock('../hooks/useStockMovements', () => ({
  useUpdateStockMovement: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useDeleteStockMovement: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { StockMovementHistory } from './StockMovementHistory'

const movement = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'm-1',
    wine_id: 'w-1',
    user_id: 'u',
    movement_type: 'in',
    quantity: 3,
    movement_date: '2026-01-15',
    notes: null,
    created_at: null,
    ...overrides,
  }) as never

describe('StockMovementHistory', () => {
  it('renders an empty-state message when there are no movements', () => {
    renderWithProviders(<StockMovementHistory movements={[]} wineId="w-1" />)
    expect(screen.getByText(/no movements|no stock|kein/i)).toBeInTheDocument()
  })

  it('renders one timeline entry per movement with signed quantity badges', () => {
    renderWithProviders(
      <StockMovementHistory
        wineId="w-1"
        movements={[
          movement({ id: 'm-1', movement_type: 'in', quantity: 4 }),
          movement({ id: 'm-2', movement_type: 'out', quantity: 1 }),
        ]}
      />,
    )
    expect(screen.getByText('+4')).toBeInTheDocument()
    expect(screen.getByText('-1')).toBeInTheDocument()
  })

  it('shows the notes when present', () => {
    renderWithProviders(
      <StockMovementHistory
        wineId="w-1"
        movements={[movement({ notes: 'Drunk at dinner' })]}
      />,
    )
    expect(screen.getByText('Drunk at dinner')).toBeInTheDocument()
  })

  it('confirms before calling deleteMovement and skips the call when cancelled', async () => {
    const user = userEvent.setup()
    deleteMutateAsync.mockClear()
    const confirmFn = vi.fn(() => false)
    Object.defineProperty(window, 'confirm', { configurable: true, value: confirmFn })

    renderWithProviders(
      <StockMovementHistory wineId="w-1" movements={[movement()]} />,
    )

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(confirmFn).toHaveBeenCalled()
    expect(deleteMutateAsync).not.toHaveBeenCalled()
  })

  it('calls deleteMovement.mutateAsync with the right id when confirmed', async () => {
    const user = userEvent.setup()
    deleteMutateAsync.mockClear()
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => true),
    })

    renderWithProviders(
      <StockMovementHistory wineId="w-1" movements={[movement({ id: 'm-99' })]} />,
    )

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 'm-99', wineId: 'w-1' })
  })
})
