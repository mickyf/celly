import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'

// Recharts uses ResizeObserver under the hood, which happy-dom doesn't ship with
// useful sizing. Stub the chart components to plain divs so we can assert what
// data made it to the chart.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-recharts="responsive">{children}</div>,
  LineChart: ({ data, children }: { data: unknown[]; children: ReactNode }) => (
    <div data-recharts="line-chart" data-count={data.length}>{children}</div>
  ),
  Line: () => <div data-recharts="line" />,
  XAxis: () => <div data-recharts="x-axis" />,
  YAxis: () => <div data-recharts="y-axis" />,
  CartesianGrid: () => <div data-recharts="grid" />,
  Tooltip: () => <div data-recharts="tooltip" />,
  Legend: () => <div data-recharts="legend" />,
}))

import { renderWithProviders } from '../test/renderWithProviders'
import { ConsumptionChart } from './ConsumptionChart'

describe('ConsumptionChart', () => {
  it('renders an empty-state message when there is no data', () => {
    renderWithProviders(<ConsumptionChart data={[]} />)
    expect(screen.getByText(/no consumption data/i)).toBeInTheDocument()
  })

  it('renders the line chart with the supplied data points', () => {
    const data = [
      { date: '2026-01', count: 5 },
      { date: '2026-02', count: 7 },
      { date: '2026-03', count: 6 },
    ]
    const { container } = renderWithProviders(<ConsumptionChart data={data} />)

    const chart = container.querySelector('[data-recharts="line-chart"]')
    expect(chart).toHaveAttribute('data-count', '3')
  })
})
