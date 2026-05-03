import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import {
  WineCardSkeleton,
  WineGridSkeleton,
  StatCardSkeleton,
  DashboardStatsSkeleton,
} from './skeletons'

const skeletonCount = (container: HTMLElement) =>
  container.querySelectorAll('[class*="Skeleton"]').length

describe('skeletons', () => {
  it('WineCardSkeleton renders', () => {
    const { container } = renderWithProviders(<WineCardSkeleton />)
    expect(skeletonCount(container)).toBeGreaterThan(0)
  })

  it('WineGridSkeleton renders the requested count', () => {
    const { container } = renderWithProviders(<WineGridSkeleton count={3} />)
    // Each card has multiple skeleton bars; just assert there are at least 3*1.
    expect(skeletonCount(container)).toBeGreaterThanOrEqual(3)
  })

  it('StatCardSkeleton renders', () => {
    const { container } = renderWithProviders(<StatCardSkeleton />)
    expect(skeletonCount(container)).toBeGreaterThan(0)
  })

  it('DashboardStatsSkeleton renders', () => {
    const { container } = renderWithProviders(<DashboardStatsSkeleton />)
    expect(skeletonCount(container)).toBeGreaterThan(0)
  })
})
