import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { instrumentRouter } from './lib/sentry'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const router = createRouter({ routeTree })

// Instrument router for Sentry
instrumentRouter(router)

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Safety net for unhandled query errors; toasts are surfaced per-hook.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      Sentry.captureException(error, {
        tags: { source: 'query-cache-onError' },
        contexts: { query: { queryKey: JSON.stringify(query.queryKey) } },
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
})

const App = Sentry.withProfiler(function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
})

export default App
