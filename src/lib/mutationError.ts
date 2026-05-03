import { notifications } from '@mantine/notifications'
import * as Sentry from '@sentry/react'
import type { TFunction } from 'i18next'

// Standard onError handler for mutations: report to Sentry and show a red
// toast. Most mutationFns also capture explicitly with rich context — the
// extra report here is a safety net for unexpected throws (e.g. bugs in
// onSuccess or in the caller's await chain). Sentry deduplicates by stack
// fingerprint, so the cosmetic double-report on known errors is acceptable
// versus silently missing surprise failures.
export function showMutationError(t: TFunction, error: Error) {
  Sentry.captureException(error, { tags: { source: 'mutation-error-handler' } })
  notifications.show({
    title: t('common:errors.toastTitle'),
    message: error.message,
    color: 'red',
  })
}
