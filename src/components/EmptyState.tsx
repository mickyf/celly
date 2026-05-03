import { Stack, Text, Button, Center } from '@mantine/core'
import type { MantineColor } from '@mantine/core'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
  actionLeftSection?: ReactNode
  actionColor?: MantineColor
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionLeftSection,
  actionColor,
}: EmptyStateProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="md" maw={420}>
        {icon}
        {title && (
          <Text fw={600} size="lg" ta="center">
            {title}
          </Text>
        )}
        <Text c="dimmed" ta="center">
          {message}
        </Text>
        {actionLabel && onAction && (
          <Button onClick={onAction} leftSection={actionLeftSection} color={actionColor} size="md" mt="xs">
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Center>
  )
}
