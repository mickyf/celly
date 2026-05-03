import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from './useOnlineStatus'

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('useOnlineStatus', () => {
  afterEach(() => {
    setOnline(true)
  })

  it('initialises from navigator.onLine', () => {
    setOnline(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it('flips to false on the offline event and back on the online event', () => {
    setOnline(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })

  it('removes listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    unmount()

    // After unmount the event must not crash and must not affect the previous result.
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(true)
  })
})
