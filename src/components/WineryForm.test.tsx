import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/claude', () => ({
  enrichWineryData: vi.fn(),
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { WineryForm } from './WineryForm'

describe('WineryForm', () => {
  it('blocks submit when the name is whitespace-only', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<WineryForm onSubmit={onSubmit} />)

    await user.type(screen.getByRole('textbox', { name: /winery name/i }), '  ')
    await user.click(screen.getByRole('button', { name: /add winery/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/winery name is required/i)).toBeInTheDocument()
  })

  it('submits name + country_code on a valid entry', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<WineryForm onSubmit={onSubmit} />)

    await user.type(screen.getByRole('textbox', { name: /winery name/i }), 'Domaine Test')
    await user.click(screen.getByRole('button', { name: /add winery/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Domaine Test',
      country_code: null,
    })
  })

  it('shows the update button when editing an existing winery', () => {
    renderWithProviders(
      <WineryForm
        winery={{
          id: 'wy-1',
          name: 'Existing',
          country_code: 'FR',
          user_id: 'u-1',
          created_at: null,
          updated_at: null,
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /update winery/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /winery name/i })).toHaveValue('Existing')
  })

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    renderWithProviders(<WineryForm onSubmit={vi.fn()} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
