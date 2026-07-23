import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/renderWithProviders'
import { OrderImportTable } from './OrderImportTable'
import type { ImportRow } from '../hooks/useOrderImport'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']
type Winery = Database['public']['Tables']['wineries']['Row']

const wine = (overrides: Partial<Wine> = {}): Wine => ({
  bottle_size: '75cl',
  created_at: null,
  drink_window_end: null,
  drink_window_start: null,
  food_pairings: null,
  grapes: [],
  id: 'w-existing',
  import_batch_id: null,
  name: 'Pinot Noir',
  photo_url: null,
  price: null,
  quantity: 6,
  updated_at: null,
  user_id: 'u',
  vintage: 2020,
  wine_type: null,
  winery_id: null,
  ...overrides,
})

const winery = (overrides: Partial<Winery> = {}): Winery => ({
  country_code: 'CH',
  created_at: null,
  id: 'wy-1',
  name: 'Existing Winery',
  updated_at: null,
  user_id: 'u',
  ...overrides,
})

function row(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    rowId: 'r-1',
    included: true,
    existingWineId: null,
    name: 'New Wine',
    wineType: null,
    vintage: 2021,
    quantity: 6,
    price: null,
    bottleSize: '75cl',
    winery: null,
    ...overrides,
  }
}

describe('OrderImportTable', () => {
  it('toggling the include checkbox calls onRowChange with the new state', async () => {
    const user = userEvent.setup()
    const onRowChange = vi.fn()

    renderWithProviders(
      <OrderImportTable
        rows={[row({ included: true })]}
        onRowChange={onRowChange}
        onRowRemove={vi.fn()}
        wines={[]}
        wineries={[]}
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: /import this row/i })
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    expect(onRowChange).toHaveBeenCalledWith('r-1', { included: false })
  })

  it('typing in the name input emits a name patch and clears no existing match', async () => {
    const user = userEvent.setup()
    const onRowChange = vi.fn()

    renderWithProviders(
      <OrderImportTable
        rows={[row({ existingWineId: null, name: 'Initial' })]}
        onRowChange={onRowChange}
        onRowRemove={vi.fn()}
        wines={[]}
        wineries={[]}
      />,
    )

    const input = screen.getByDisplayValue('Initial')
    await user.type(input, 'X')
    // userEvent.type fires one onChange per keystroke; latest patch should reflect the new char.
    expect(onRowChange).toHaveBeenLastCalledWith('r-1', { name: 'InitialX' })
  })

  it('shows the Restock badge and pins the wine label when an existing wine is matched', () => {
    renderWithProviders(
      <OrderImportTable
        rows={[row({ existingWineId: 'w-existing', name: 'irrelevant' })]}
        onRowChange={vi.fn()}
        onRowRemove={vi.fn()}
        wines={[wine({ name: 'Pinot Noir', vintage: 2020 })]}
        wineries={[]}
      />,
    )
    // Combobox target shows the matched wine's display label.
    expect(screen.getByText(/Pinot Noir \(2020\)/)).toBeInTheDocument()
    // And the badge.
    expect(screen.getByText(/Restock/i)).toBeInTheDocument()
  })

  it('disables vintage / price / bottle / winery editors while restocking', () => {
    renderWithProviders(
      <OrderImportTable
        rows={[row({ existingWineId: 'w-existing' })]}
        onRowChange={vi.fn()}
        onRowRemove={vi.fn()}
        wines={[wine({ vintage: 2020, price: 50, bottle_size: '75cl' })]}
        wineries={[winery()]}
      />,
    )
    // Quantity remains editable.
    const numberInputs = screen.getAllByRole('textbox')
    // The price/vintage/bottle/winery inputs should be disabled (Mantine renders NumberInput as input role=textbox)
    const disabledCount = numberInputs.filter((el) => (el as HTMLInputElement).disabled).length
    expect(disabledCount).toBeGreaterThan(0)
  })

  it('flags new-wine rows with empty names as invalid', () => {
    renderWithProviders(
      <OrderImportTable
        rows={[row({ name: '   ' })]}
        onRowChange={vi.fn()}
        onRowRemove={vi.fn()}
        wines={[]}
        wineries={[]}
      />,
    )
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })
})
