import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../hooks/useWineries', () => ({
  useWineries: () => ({ data: [{ id: 'wy-1', name: 'Domain X' }] }),
  useAddWinery: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../hooks/useWineEnrichment', () => ({
  useEnrichWineFromImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../hooks/useWinePhotoUrl', () => ({
  useWinePhotoUrl: () => ({ data: undefined }),
}))

vi.mock('./CameraCapture', () => ({
  CameraCapture: () => null,
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { WineForm } from './WineForm'

describe('WineForm', () => {
  it('blocks submit when the name is whitespace-only', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<WineForm onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox', { name: /wine name/i }), '   ')
    await user.click(screen.getByRole('button', { name: /^add wine$/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('rejects an end year that is before the start year', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<WineForm onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox', { name: /wine name/i }), 'Test')

    await user.type(screen.getByRole('textbox', { name: /start year/i }), '2030')
    await user.type(screen.getByRole('textbox', { name: /end year/i }), '2025')

    await user.click(screen.getByRole('button', { name: /^add wine$/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    // Both start and end inputs surface a complementary error message.
    expect(
      screen.getAllByText(/start year must be before end year|end year must be after/i)
        .length,
    ).toBeGreaterThan(0)
  })

  it('submits a valid wine with the default 75cl bottle size and quantity 1', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<WineForm onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox', { name: /wine name/i }), 'Barolo')
    await user.click(screen.getByRole('button', { name: /^add wine$/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const values = onSubmit.mock.calls[0][0]
    expect(values.name).toBe('Barolo')
    expect(values.quantity).toBe(1)
    expect(values.bottle_size).toBe('75cl')
  })

  it('shows the update button when editing an existing wine', () => {
    renderWithProviders(
      <WineForm
        onSubmit={vi.fn()}
        wine={{
          id: 'w-1',
          name: 'Edit me',
          grapes: ['Merlot'],
          vintage: 2020,
          quantity: 2,
          price: 30,
          bottle_size: '75cl',
          drink_window_start: 2025,
          drink_window_end: 2030,
          food_pairings: null,
          photo_url: null,
          user_id: 'u',
          winery_id: null,
          created_at: null,
          updated_at: null,
          import_batch_id: null,
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /update wine/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /wine name/i })).toHaveValue('Edit me')
  })
})
