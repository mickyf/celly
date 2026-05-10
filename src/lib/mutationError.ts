import { notifications } from '@mantine/notifications'
import * as Sentry from '@sentry/react'
import type { TFunction } from 'i18next'

interface MutationErrorOptions {
  /** Already-translated toast title. Defaults to common:errors.toastTitle. */
  title?: string
  /** Hook/operation name for Sentry grouping (e.g. 'useEnrichWine'). */
  hook?: string
}

// Belt-and-braces Sentry capture; duplicates collapse via fingerprinting.
export function showMutationError(
  t: TFunction,
  error: Error,
  options: MutationErrorOptions = {},
) {
  Sentry.captureException(error, {
    tags: {
      source: 'mutation-error-handler',
      ...(options.hook ? { hook: options.hook } : {}),
    },
  })
  notifications.show({
    title: options.title ?? t('common:errors.toastTitle'),
    message: error.message,
    color: 'red',
    autoClose: 8000,
    withCloseButton: true,
  })
}
