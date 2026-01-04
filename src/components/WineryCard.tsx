import { Card, Text, Badge, Group, Button, Stack } from '@mantine/core'
import { IconTrash, IconEdit, IconEye } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { getCountryByCode } from '../constants/countries'
import { useWineryWineCount } from '../hooks/useWineries'
import type { Tables } from '../types/database'

interface WineryCardProps {
  winery: Tables<'wineries'>
  onView?: () => void
  onEdit?: () => void
  onDelete?: (id: string) => void
}

export function WineryCard({ winery, onView, onEdit, onDelete }: WineryCardProps) {
  const { t } = useTranslation(['wineries', 'common'])
  const { data: wineCount = 0 } = useWineryWineCount(winery.id)
  const country = winery.country_code ? getCountryByCode(winery.country_code) : null

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="sm">
        <div>
          <Group justify="space-between" mb={5}>
            <Text fw={700} size="lg">
              {winery.name}
            </Text>
            <Badge variant="light" color="grape">
              {t('wineries:card.wineCount', { count: wineCount })}
            </Badge>
          </Group>
          {country && (
            <Text size="sm" c="dimmed">
              {country.flag} {country.name}
            </Text>
          )}
        </div>

        <Group justify="space-between" mt="md">
          {onView && (
            <Button
              variant="filled"
              size="xs"
              leftSection={<IconEye size={16} />}
              onClick={onView}
            >
              {t('common:buttons.viewDetails')}
            </Button>
          )}
          <Group justify="flex-end" gap="xs">
            {onEdit && (
              <Button
                variant="light"
                size="xs"
                leftSection={<IconEdit size={16} />}
                onClick={onEdit}
              >
                {t('common:buttons.edit')}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="light"
                color="red"
                size="xs"
                leftSection={<IconTrash size={16} />}
                onClick={() => onDelete(winery.id)}
                disabled={wineCount > 0}
              >
                {t('common:buttons.delete')}
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Card>
  )
}
