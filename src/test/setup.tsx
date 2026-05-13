import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Stub <Link> as a plain anchor so component tests don't need a Router context.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ to, children, params: _params, search: _search, ...rest }: {
      to?: string
      children?: React.ReactNode
      params?: unknown
      search?: unknown
      [key: string]: unknown
    }) => {
      const href = typeof to === 'string' ? to : undefined
      return <a href={href} {...rest}>{children}</a>
    },
  }
})

// Mantine's autosize Textarea uses ResizeObserver; happy-dom doesn't ship it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub
}

// Mantine's autosize Textarea also subscribes to `document.fonts.loadingdone`;
// happy-dom omits the FontFaceSet API.
if (typeof document !== 'undefined' && !document.fonts) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      ready: Promise.resolve(),
    },
  })
}

afterEach(() => {
  cleanup()
})
