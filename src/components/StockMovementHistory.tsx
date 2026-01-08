import { Paper, Text, Group, Button, Stack, Badge, Timeline, Modal } from '@mantine/core'
import { IconPlus, IconMinus, IconEdit, IconTrash, IconCalendar, IconNotes } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { Database } from '../types/database'
import dayjs from 'dayjs'
import { StockMovementForm, type StockMovementFormValues } from './StockMovementForm'
import { useUpdateStockMovement, useDeleteStockMovement } from '../hooks/useStockMovements'

type StockMovement = Database['public']['Tables']['stock_movements']['Row']

interface StockMovementHistoryProps {
  movements: StockMovement[]
  wineId: string
}

export function StockMovementHistory({ movements, wineId }: StockMovementHistoryProps) {
  const { t } = useTranslation(['wines', 'common'])
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null)
  const updateMovement = useUpdateStockMovement()
  const deleteMovement = useDeleteStockMovement()

  const handleUpdate = async (values: StockMovementFormValues) => {
    if (!editingMovement) return

    await updateMovement.mutateAsync({
      id: editingMovement.id,
      ...values,
    })
    setEditingMovement(null)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm(t('wines:stockMovement.deleteConfirm'))) {
      await deleteMovement.mutateAsync({ id, wineId })
    }
  }

  if (movements.length === 0) {
    return (
      <Paper p="md" radius="md" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          {t('wines:stockMovement.noMovements')}
        </Text>
      </Paper>
    )
  }

  return (
    <>
      <Timeline active={movements.length} bulletSize={24} lineWidth={2}>
        {movements.map((movement) => (
          <Timeline.Item
            key={movement.id}
            bullet={movement.movement_type === 'in' ? <IconPlus size={12} /> : <IconMinus size={12} />}
            title={
              <Group gap="xs">
                <Badge color={movement.movement_type === 'in' ? 'green' : 'red'} size="sm">
                  {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                </Badge>
                <Text size="sm" fw={500}>
                  {t(`wines:stockMovement.type.${movement.movement_type}`)}
                </Text>
              </Group>
            }
          >
            <Stack gap="xs" mt="xs">
              <Group gap="xs">
                <IconCalendar size={14} />
                <Text size="xs" c="dimmed">
                  {dayjs(movement.movement_date).format('DD.MM.YYYY')}
                </Text>
              </Group>

              {movement.notes && (
                <Group gap="xs" align="flex-start">
                  <IconNotes size={14} style={{ marginTop: 2 }} />
                  <Text size="xs" style={{ whiteSpace: 'pre-wrap', flex: 1 }}>
                    {movement.notes}
                  </Text>
                </Group>
              )}

              <Group gap="xs" mt="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => setEditingMovement(movement)}
                >
                  {t('common:buttons.edit')}
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => handleDelete(movement.id)}
                >
                  {t('common:buttons.delete')}
                </Button>
              </Group>
            </Stack>
          </Timeline.Item>
        ))}
      </Timeline>

      <Modal
        opened={!!editingMovement}
        onClose={() => setEditingMovement(null)}
        title={t('wines:stockMovement.editMovement')}
      >
        {editingMovement && (
          <StockMovementForm
            wineId={wineId}
            movement={editingMovement}
            onSubmit={handleUpdate}
            onCancel={() => setEditingMovement(null)}
            isLoading={updateMovement.isPending}
          />
        )}
      </Modal>
    </>
  )
}
