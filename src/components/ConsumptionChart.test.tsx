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
  Line: ({ children }: { children?: ReactNode }) => <div data-recharts="line">{children}</div>,
  LabelList: ({
    dataKey,
    position,
    formatter,
  }: {
    dataKey: string
    position: string
    formatter: (value: unknown) => string
  }) => (
    <div
      data-recharts="label-list"
      data-key={dataKey}
      data-position={position}
      // Sample the formatter so the sign and the zero-suppression are asserted.
      data-sample={formatter(3)}
      data-zero={formatter(0)}
    />
  ),
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
      { date: '2026-01', count: 5, added: 5, removed: 0 },
      { date: '2026-02', count: 7, added: 3, removed: 1 },
      { date: '2026-03', count: 6, added: 0, removed: 1 },
    ]
    const { container } = renderWithProviders(<ConsumptionChart data={data} />)

    const chart = container.querySelector('[data-recharts="line-chart"]')
    expect(chart).toHaveAttribute('data-count', '3')
  })

  it('annotates each point with additions above and removals below', () => {
    const data = [{ date: '2026-01', count: 5, added: 5, removed: 2 }]
    const { container } = renderWithProviders(<ConsumptionChart data={data} />)

    const labels = Array.from(container.querySelectorAll('[data-recharts="label-list"]'))
    expect(labels).toHaveLength(2)

    const added = labels.find((l) => l.getAttribute('data-key') === 'added')
    expect(added).toHaveAttribute('data-position', 'top')
    expect(added).toHaveAttribute('data-sample', '+3')

    const removed = labels.find((l) => l.getAttribute('data-key') === 'removed')
    expect(removed).toHaveAttribute('data-position', 'bottom')
    // Stored positive, rendered negative.
    expect(removed).toHaveAttribute('data-sample', '-3')

    // A month with no movement on one side stays unannotated on that side.
    expect(added).toHaveAttribute('data-zero', '')
    expect(removed).toHaveAttribute('data-zero', '')
  })
})
