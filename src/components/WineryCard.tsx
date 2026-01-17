import { Card, Text, Badge, Group, Button, Stack } from '@mantine/core'
import { IconTrash, IconEdit, IconEye } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { getCountryByCode } from '../constants/countries'
import type { Tables } from '../types/database'

interface WineryCardProps {
  winery: Tables<'wineries'>
  wineCount: number
  onView?: () => void
  onEdit?: () => void
  onDelete?: (id: string) => void
}

export function WineryCard({ winery, wineCount, onView, onEdit, onDelete }: WineryCardProps) {
  const { t } = useTranslation(['wineries', 'common'])
  const country = winery.country_code ? getCountryByCode(winery.country_code, t) : null
  const BADGE_GAP = 3;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="sm" mb="md">
        <div>
          <Group justify="space-between" mb={5}>
            <Text fw={700} size="lg">
              {winery.name}
            </Text>
          </Group>
          <div>
            <Badge variant="light" color="grape" mr={BADGE_GAP}>
              {t('wineries:card.wineCount', { count: wineCount })}
            </Badge>
            {country && (
              <Badge variant='outline' color='yellow' mr={BADGE_GAP}>
                {country.flag} {country.name}
              </Badge>
            )}
          </div>
        </div>
      </Stack>

      <Card.Section withBorder inheritPadding py="xs" mt="auto">
        <Group gap="xs" justify='flex-start'>
          {onView && (
            <Button
              variant="filled"
              leftSection={<IconEye size={16} />}
              onClick={onView}
            >
              {t('common:buttons.viewDetails')}
            </Button>
          )}

          {onEdit && (
            <Button
              ml="auto"
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={onEdit}
              pr={0}
            />
          )}
          {onDelete && (
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => onDelete(winery.id)}
              disabled={wineCount > 0}
              pr={0}
            />
          )}
        </Group>
      </Card.Section>
    </Card>
  )
}
