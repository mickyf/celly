import { Card, Image, Text, Badge, Group, Button, Stack } from '@mantine/core'
import { IconGlass, IconTrash, IconEdit, IconEye } from '@tabler/icons-react'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

interface WineCardProps {
  wine: Wine
  onView?: () => void
  onEdit?: () => void
  onDelete?: (id: string) => void
}

export function WineCard({ wine, onView, onEdit, onDelete }: WineCardProps) {
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
          <Image src={wine.photo_url} height={200} alt={wine.name} />
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
                Ready
              </Badge>
            )}
          </Group>
          {wine.vintage && (
            <Text size="sm" c="dimmed">
              Vintage: {wine.vintage}
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

        <Group>
          <Text size="sm" c="dimmed">
            Quantity: {wine.quantity}
          </Text>
          {wine.price && (
            <Text size="sm" c="dimmed">
              ${wine.price.toFixed(2)}
            </Text>
          )}
        </Group>

        {wine.drink_window_start && wine.drink_window_end && (
          <Text size="sm" c="dimmed">
            Drink: {wine.drink_window_start}-{wine.drink_window_end}
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
              View Details
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
                Edit
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
                Delete
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Card>
  )
}
