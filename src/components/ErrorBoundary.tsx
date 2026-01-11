import * as Sentry from '@sentry/react'
import { Container, Title, Text, Button, Stack, Paper, Code } from '@mantine/core'
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

function ErrorFallback({
  error,
  componentStack,
  resetError,
}: {
  error: unknown
  componentStack: string
  eventId: string
  resetError: () => void
}) {
  // Type guard to ensure error is an Error object
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
  const { t } = useTranslation('common')
  const isDevelopment = import.meta.env.MODE === 'development'

  return (
    <Container size="md" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Stack gap="md">
          <Stack gap="xs" align="center">
            <IconAlertTriangle size={48} color="var(--mantine-color-red-6)" />
            <Title order={2}>{t('errors.boundary.title', 'Something went wrong')}</Title>
          </Stack>

          <Text c="dimmed" ta="center">
            {t('errors.boundary.message', 'An unexpected error occurred. Our team has been notified.')}
          </Text>

          {isDevelopment && (
            <Stack gap="xs">
              <Text fw={500} size="sm">Error Details (Development Only):</Text>
              <Code block>{errorMessage}</Code>
              {componentStack && (
                <>
                  <Text fw={500} size="sm" mt="md">Component Stack:</Text>
                  <Code block style={{ fontSize: '0.75rem' }}>{componentStack}</Code>
                </>
              )}
            </Stack>
          )}

          <Stack gap="sm" mt="md">
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={resetError}
              variant="filled"
            >
              {t('errors.boundary.retry', 'Try Again')}
            </Button>
            <Button
              leftSection={<IconHome size={16} />}
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              {t('errors.boundary.home', 'Go to Dashboard')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  )
}

export const AppErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: ErrorFallback,
    showDialog: false, // We have our own UI
  }
)
