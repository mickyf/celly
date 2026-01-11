import * as Sentry from '@sentry/react'
import { sentryConfig, isDevelopment } from '../config/environment'

export function initializeSentry() {
  // Skip initialization if no DSN provided (allows running without Sentry in dev)
  if (!sentryConfig.dsn) {
    if (isDevelopment) {
      console.warn('Sentry DSN not configured - error tracking disabled')
    }
    return
  }

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    debug: sentryConfig.debug,
    tunnel: sentryConfig.tunnel,

    // Performance Monitoring
    tracesSampleRate: sentryConfig.tracesSampleRate,

    // Enable automatic instrumentation
    integrations: [
      // Browser performance monitoring
      Sentry.browserTracingIntegration(),

      // React-specific integrations
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask user-entered text
        blockAllMedia: true, // Privacy: block images/videos
      }),

      // HTTP breadcrumbs
      Sentry.httpClientIntegration({
        failedRequestStatusCodes: [400, 599], // Track 4xx and 5xx errors
      }),
    ],

    // Session Replay sample rates
    replaysSessionSampleRate: isDevelopment ? 1.0 : 0.1, // 100% dev, 10% prod
    replaysOnErrorSampleRate: 1.0, // Always capture on error

    // Release tracking (set by Vite plugin)
    release: import.meta.env.VITE_SENTRY_RELEASE,

    // Filter out localhost errors in production
    beforeSend(event, hint) {
      if (isDevelopment) {
        console.log('Sentry Event:', event, hint)
      }

      // Don't send events from localhost in production
      if (!isDevelopment && event.request?.url?.includes('localhost')) {
        return null
      }

      return event
    },

    // Ignore known errors
    ignoreErrors: [
      // Browser extensions
      'Non-Error promise rejection captured',
      // Network errors that aren't actionable
      'NetworkError',
      'Failed to fetch',
    ],
  })
}

// Router instrumentation for TanStack Router
export function instrumentRouter(router: any) {
  // Track route changes as transactions
  router.subscribe('onLoad', ({ toLocation }: any) => {
    Sentry.startSpan(
      {
        name: toLocation.pathname,
        op: 'navigation',
        attributes: {
          'routing.from': window.location.pathname,
          'routing.to': toLocation.pathname,
        },
      },
      () => {
        // Transaction automatically ends when navigation completes
      }
    )
  })
}
