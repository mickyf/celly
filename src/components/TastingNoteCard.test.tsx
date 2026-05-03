import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { TastingNoteCard } from './TastingNoteCard'

const note = {
  id: 'n-1',
  wine_id: 'w-1',
  user_id: 'u-1',
  rating: 4,
  notes: 'Earthy and balanced',
  tasted_at: '2026-01-15',
  created_at: null,
}

describe('TastingNoteCard', () => {
  it('renders note text and the formatted date', () => {
    renderWithProviders(<TastingNoteCard note={note} />)
    expect(screen.getByText('Earthy and balanced')).toBeInTheDocument()
    expect(screen.getByText('15.01.2026')).toBeInTheDocument()
  })

  it('hides edit/delete buttons when no callbacks are passed', () => {
    renderWithProviders(<TastingNoteCard note={note} />)
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('fires the right callbacks when edit/delete are clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderWithProviders(<TastingNoteCard note={note} onEdit={onEdit} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: /edit/i }))
    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
