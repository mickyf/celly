import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { StockMovementForm } from './StockMovementForm'

describe('StockMovementForm', () => {
  it('uses sensible defaults: type=in, quantity=1, today as date', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<StockMovementForm wineId="w-1" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /record movement/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const values = onSubmit.mock.calls[0][0]
    expect(values.movement_type).toBe('in')
    expect(values.quantity).toBe(1)
    expect(typeof values.movement_date).toBe('string')
  })

  it('switches to "out" via the segmented control', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<StockMovementForm wineId="w-1" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('radio', { name: /stock out/i }))
    await user.click(screen.getByRole('button', { name: /record movement/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].movement_type).toBe('out')
  })

  it('shows the update button when editing an existing movement', () => {
    renderWithProviders(
      <StockMovementForm
        wineId="w-1"
        movement={{
          id: 'm-1',
          wine_id: 'w-1',
          user_id: 'u-1',
          movement_type: 'out',
          quantity: 2,
          notes: 'Drunk at dinner',
          movement_date: '2026-01-01',
          created_at: null,
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /update movement/i })).toBeInTheDocument()
  })

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    renderWithProviders(
      <StockMovementForm wineId="w-1" onSubmit={vi.fn()} onCancel={onCancel} />,
    )
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
