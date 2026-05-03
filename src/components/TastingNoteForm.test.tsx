import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { TastingNoteForm } from './TastingNoteForm'

describe('TastingNoteForm', () => {
  it('blocks submit on whitespace-only notes via Mantine validation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<TastingNoteForm wineId="w-1" onSubmit={onSubmit} />)

    // Type spaces to bypass HTML5 `required` and exercise Mantine's trim check.
    await user.type(screen.getByRole('textbox'), '   ')
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/notes are required/i)).toBeInTheDocument()
  })

  it('submits values when filled in', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<TastingNoteForm wineId="w-1" onSubmit={onSubmit} />)

    await user.type(screen.getByRole('textbox'), 'Earthy with a long finish')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const values = onSubmit.mock.calls[0][0]
    expect(values.notes).toBe('Earthy with a long finish')
    expect(values.rating).toBe(3) // initial default
    expect(typeof values.tasted_at).toBe('string')
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    renderWithProviders(
      <TastingNoteForm wineId="w-1" onSubmit={vi.fn()} onCancel={onCancel} />,
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows the update label when editing an existing note', () => {
    renderWithProviders(
      <TastingNoteForm
        wineId="w-1"
        note={{
          id: 'n-1',
          wine_id: 'w-1',
          user_id: 'u-1',
          rating: 4,
          notes: 'Lovely',
          tasted_at: '2026-01-01',
          created_at: null,
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
  })
})
