import * as Sentry from '@sentry/react'
import { Container, Paper, Stack, Title, Text, Button, Code } from '@mantine/core'
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'

interface RouteErrorProps {
  error: Error
  reset?: () => void
}

export function RouteError({ error, reset }: RouteErrorProps) {
  const { t } = useTranslation('common')
  const isDev = import.meta.env.MODE === 'development'

  useEffect(() => {
    Sentry.captureException(error, { tags: { source: 'route-error-boundary' } })
  }, [error])

  return (
    <Container size="md" py="xl">
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="md" align="center">
          <IconAlertTriangle size={48} color="var(--mantine-color-red-6)" />
          <Title order={3}>{t('errors.boundary.title')}</Title>
          <Text c="dimmed" ta="center">
            {t('errors.boundary.message')}
          </Text>
          {isDev && (
            <Code block w="100%">
              {error.message}
            </Code>
          )}
          <Stack gap="xs" w="100%" maw={320}>
            {reset && (
              <Button leftSection={<IconRefresh size={16} />} onClick={reset}>
                {t('errors.boundary.retry')}
              </Button>
            )}
            <Button
              component={Link}
              to="/"
              variant="outline"
              leftSection={<IconHome size={16} />}
            >
              {t('errors.boundary.home')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  )
}
