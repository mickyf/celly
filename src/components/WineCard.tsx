import { Card, Image, Text, Badge, Group, Button, Stack, Tooltip } from '@mantine/core'
import { IconGlass, IconTrash, IconEdit, IconEye, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useWinery } from '../hooks/useWineries'
import { useStockMovements } from '../hooks/useStockMovements'
import type { Database } from '../types/database'
import dayjs from 'dayjs'

type Wine = Database['public']['Tables']['wines']['Row']

interface WineCardProps {
  wine: Wine
  onView?: () => void
  onEdit?: () => void
  onDelete?: (id: string) => void
  showRecentMovements?: boolean
}

export function WineCard({ wine, onView, onEdit, onDelete, showRecentMovements = false }: WineCardProps) {
  const { t } = useTranslation(['wines', 'common'])
  const { data: winery } = useWinery(wine.winery_id || '')
  const { data: stockMovements } = useStockMovements(showRecentMovements ? wine.id : undefined)

  const currentYear = new Date().getFullYear()
  const isReadyToDrink =
    wine.drink_window_start &&
    wine.drink_window_end &&
    currentYear >= wine.drink_window_start &&
    currentYear <= wine.drink_window_end

  // Get most recent stock movement (if enabled)
  const recentMovement = showRecentMovements && stockMovements && stockMovements.length > 0
    ? stockMovements[0]
    : null

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        {wine.photo_url ? (
          <Image src={wine.photo_url} height={200} alt={wine.name} fit='contain' />
        ) : (
          <div
            style={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
            }}
          >
            <IconGlass size={64} stroke={1.5} color="#adb5bd" />
          </div>
        )}
      </Card.Section>

      <Stack gap="sm" mt="md">
        <div>
          <Group justify="space-between" mb={5}>
            <Text fw={700} size="lg">
              {wine.name}
            </Text>
            {isReadyToDrink && (
              <Badge color="green" variant="light">
                {t('common:status.ready')}
              </Badge>
            )}
          </Group>
          {winery && (
            <Text size="sm" c="dimmed">
              {winery.name}
            </Text>
          )}
          {wine.vintage && (
            <Text size="sm" c="dimmed">
              {t('wines:card.vintage', { vintage: wine.vintage })}
            </Text>
          )}
        </div>

        {wine.grapes && wine.grapes.length > 0 && (
          <Group gap="xs">
            {wine.grapes.map((grape, index) => (
              <Badge key={index} variant="light">
                {grape}
              </Badge>
            ))}
          </Group>
        )}

        <Group justify="space-between">
          <Group>
            <Text size="sm" c="dimmed">
              {t('wines:card.quantity', { quantity: wine.quantity })}
            </Text>
            {wine.price && (
              <Text size="sm" c="dimmed">
                CHF {wine.price.toFixed(2)}
              </Text>
            )}
          </Group>
          {recentMovement && (
            <Tooltip label={`${dayjs(recentMovement.movement_date).format('DD.MM.YYYY')}: ${recentMovement.notes || t(`wines:stockMovement.type.${recentMovement.movement_type}`)}`}>
              <Badge
                size="sm"
                color={recentMovement.movement_type === 'in' ? 'green' : 'orange'}
                variant="light"
                leftSection={recentMovement.movement_type === 'in' ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
              >
                {recentMovement.movement_type === 'in' ? '+' : '-'}{recentMovement.quantity}
              </Badge>
            </Tooltip>
          )}
        </Group>

        {wine.drink_window_start && wine.drink_window_end && (
          <Text size="sm" c="dimmed">
            {t('wines:card.drinkWindow', { start: wine.drink_window_start, end: wine.drink_window_end })}
          </Text>
        )}

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
          <Group justify="flex-end">
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
                onClick={() => onDelete(wine.id)}
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
