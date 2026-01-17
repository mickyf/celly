import { Card, Image, Text, Badge, Group, Button, Stack, Tooltip, Anchor } from '@mantine/core'
import { IconGlass, IconTrash, IconEdit, IconEye, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'
import dayjs from 'dayjs'

type Wine = Database['public']['Tables']['wines']['Row']
type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type StockMovement = Database['public']['Tables']['stock_movements']['Row']

interface WineCardProps {
  wine: Wine
  winery?: Tables<'wineries'> | null
  recentStockMovement?: StockMovement | null
  onView?: () => void
  onEdit?: () => void
  onDelete?: (id: string) => void
}

export function WineCard({
  wine,
  winery,
  recentStockMovement,
  onView,
  onEdit,
  onDelete,
}: WineCardProps) {
  const { t } = useTranslation(['wines', 'common'])

  const recentMovement = recentStockMovement

  const BADGE_GAP = 3;
  const currentYear = new Date().getFullYear()
  const isReadyToDrink =
    wine.drink_window_start &&
    wine.drink_window_end &&
    currentYear >= wine.drink_window_start &&
    currentYear <= wine.drink_window_end

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

      <Stack gap="sm" mt="md" mb="md">

        <Group justify="space-between" mb={5}>
          {onView ? (
            <Anchor
              component="button"
              onClick={onView}
              fw={700}
              size="lg"
              underline="never"
              c="inherit"
              style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0, textAlign: 'left' }}
            >
              {wine.name}
            </Anchor>
          ) : (
            <Text fw={700} size="lg">
              {wine.name}
            </Text>
          )}
        </Group>

        <div>
          {isReadyToDrink && (
            <Badge color="green" variant="light" mr={BADGE_GAP}>
              {t('wines:card.ready')}
            </Badge>
          )}

          {winery && (
            <Badge color="grape" variant="outline" mr={BADGE_GAP}>
              {winery.name}
            </Badge>
          )}

          {wine.vintage && (
            <Badge color="yellow" variant="light" mr={BADGE_GAP}>
              {t('wines:card.vintage', { vintage: wine.vintage })}
            </Badge>
          )}

          {wine.grapes && wine.grapes.length > 0 && (
            wine.grapes.map((grape, index) => (
              <Badge key={index} variant="light" mr={BADGE_GAP}>
                {grape}
              </Badge>
            ))
          )}
        </div>

        <div>
          <Badge color='blue' variant='light' mr={BADGE_GAP}>
            {t('wines:card.quantity', { quantity: wine.quantity })}
          </Badge>
          {wine.price && (
            <Badge color='blue' variant='outline' mr={BADGE_GAP}>
              CHF {wine.price.toFixed(2)}
            </Badge>
          )}
          {wine.bottle_size && (
            <Badge color='gray' variant='light' mr={BADGE_GAP}>
              {wine.bottle_size}
            </Badge>
          )}

          {recentMovement && (
            <Tooltip label={`${dayjs(recentMovement.movement_date).format('DD.MM.YYYY')}: ${recentMovement.notes || t(`wines:stockMovement.type.${recentMovement.movement_type}`)}`}>
              <Badge
                color={recentMovement.movement_type === 'in' ? 'green' : 'orange'}
                variant="light"
                leftSection={recentMovement.movement_type === 'in' ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
                mr={BADGE_GAP}
              >
                {recentMovement.movement_type === 'in' ? '+' : '-'}{recentMovement.quantity}
              </Badge>
            </Tooltip>
          )}
          {wine.drink_window_start && wine.drink_window_end && (
            <Badge color='yellow' variant='light' mr={BADGE_GAP}>
              {t('wines:card.drinkWindow', { start: wine.drink_window_start, end: wine.drink_window_end })}
            </Badge>
          )}
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
              onClick={() => onDelete(wine.id)}
              pr={0}
            />
          )}
        </Group>
      </Card.Section>
    </Card>
  )
}
