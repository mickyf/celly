import { notifications } from '@mantine/notifications'
import * as Sentry from '@sentry/react'
import type { TFunction } from 'i18next'

// Sentry capture is a safety net for surprise throws not caught in mutationFn;
// duplicates with rich-context captures collapse via Sentry fingerprinting.
export function showMutationError(t: TFunction, error: Error) {
  Sentry.captureException(error, { tags: { source: 'mutation-error-handler' } })
  notifications.show({
    title: t('common:errors.toastTitle'),
    message: error.message,
    color: 'red',
  })
}
