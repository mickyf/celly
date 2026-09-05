import { describe, it, expect, vi } from 'vitest'
import { cloneElement, isValidElement, type ReactElement } from 'react'

/**
 * Renders ConsumptionChart against REAL recharts, unlike ConsumptionChart.test.tsx
 * which stubs the library to assert wiring. That stub cannot tell the difference
 * between "labels configured correctly" and "recharts silently rendered none", so
 * this file checks the actual SVG text output and where it lands.
 *
 * Only ResponsiveContainer is substituted: happy-dom reports zero size for it, so
 * the chart would render nothing at all.
 */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      isValidElement(children)
        ? cloneElement(children as ReactElement<{ width: number; height: number }>, {
            width: CHART_WIDTH,
            height: CHART_HEIGHT,
          })
        : children,
  }
})

import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import { ConsumptionChart, DeltaTooltip } from './ConsumptionChart'

const CHART_WIDTH = 700
const CHART_HEIGHT = 320

function deltaLabels(container: HTMLElement) {
  return Array.from(container.querySelectorAll('text'))
    .map((t) => ({
      text: t.textContent ?? '',
      x: Number(t.getAttribute('x')),
      y: Number(t.getAttribute('y')),
      fill: t.getAttribute('fill'),
    }))
    .filter((t) => /^[+-]\d+$/.test(t.text))
}

describe('ConsumptionChart (real recharts)', () => {
  it('draws a +N above and a -N below each point that moved', () => {
    const { container } = renderWithProviders(
      <ConsumptionChart
        data={[
          { date: '2026-01', count: 7, added: 10, removed: 3 },
          { date: '2026-02', count: 5, added: 0, removed: 2 },
          { date: '2026-03', count: 9, added: 4, removed: 0 },
        ]}
      />,
    )

    const labels = deltaLabels(container)
    expect(labels.map((l) => l.text).sort()).toEqual(['+10', '+4', '-2', '-3'].sort())

    // Additions sit above their point, removals below.
    const jan = labels.filter((l) => l.text === '+10' || l.text === '-3')
    const [added, removed] = [
      jan.find((l) => l.text === '+10')!,
      jan.find((l) => l.text === '-3')!,
    ]
    expect(added.x).toBe(removed.x)
    expect(added.y).toBeLessThan(removed.y) // smaller y = higher on screen
    expect(added.fill).toContain('teal')
    expect(removed.fill).toContain('red')
  })

  it('leaves a side unannotated when nothing moved that way', () => {
    const { container } = renderWithProviders(
      <ConsumptionChart data={[{ date: '2026-01', count: 5, added: 5, removed: 0 }]} />,
    )
    expect(deltaLabels(container).map((l) => l.text)).toEqual(['+5'])
  })

  it('keeps labels inside the chart when the series hits its extremes', () => {
    // A point at the top of the range, and one at zero — where an above/below
    // label would otherwise be clipped by the SVG edge or land on the x-axis.
    const { container } = renderWithProviders(
      <ConsumptionChart
        data={[
          { date: '2026-01', count: 12, added: 12, removed: 0 },
          { date: '2026-02', count: 0, added: 0, removed: 12 },
          { date: '2026-03', count: 5, added: 5, removed: 0 },
        ]}
      />,
    )

    const labels = deltaLabels(container)
    expect(labels).toHaveLength(3)
    for (const label of labels) {
      expect(label.y).toBeGreaterThan(8)
      expect(label.y).toBeLessThan(CHART_HEIGHT - 30) // clear of the x-axis ticks
      expect(label.x).toBeGreaterThan(0)
      expect(label.x).toBeLessThan(CHART_WIDTH)
    }
  })

  it('shows additions, removals and the total in the tooltip', () => {
    renderWithProviders(
      <DeltaTooltip
        active
        label="2026-02"
        payload={[{ payload: { date: '2026-02', count: 5, added: 3, removed: 1 } }]}
      />,
    )

    expect(screen.getByText(/Month: 2026-02/)).toBeInTheDocument()
    expect(screen.getByText(/Added: \+3/)).toBeInTheDocument()
    expect(screen.getByText(/Removed: -1/)).toBeInTheDocument()
    expect(screen.getByText(/Bottle Count: 5/)).toBeInTheDocument()
  })

  it('shows a plain 0 in the tooltip for a direction that saw no movement', () => {
    renderWithProviders(
      <DeltaTooltip
        active
        label="2026-03"
        payload={[{ payload: { date: '2026-03', count: 9, added: 4, removed: 0 } }]}
      />,
    )

    expect(screen.getByText(/Added: \+4/)).toBeInTheDocument()
    // Unlike the on-chart label, the tooltip always lists all three figures.
    expect(screen.getByText(/Removed: 0/)).toBeInTheDocument()
  })

  it('renders nothing when the tooltip is inactive', () => {
    renderWithProviders(
      <DeltaTooltip
        active={false}
        label="2026-03"
        payload={[{ payload: { date: '2026-03', count: 9, added: 4, removed: 0 } }]}
      />,
    )
    expect(screen.queryByText(/Bottle Count/)).not.toBeInTheDocument()

    // Same when recharts hands it an active state with no payload yet.
    renderWithProviders(<DeltaTooltip active />)
    expect(screen.queryByText(/Bottle Count/)).not.toBeInTheDocument()
  })
})
