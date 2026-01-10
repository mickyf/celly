import { useForm } from '@mantine/form'
import { Textarea, Button, Stack, Group, NumberInput, SegmentedControl } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'

type StockMovement = Database['public']['Tables']['stock_movements']['Row']
type MovementType = Database['public']['Enums']['movement_type']

interface StockMovementFormProps {
  wineId: string
  movement?: StockMovement
  onSubmit: (values: StockMovementFormValues) => void
  onCancel?: () => void
  isLoading?: boolean
}

export interface StockMovementFormValues {
  movement_type: MovementType
  quantity: number
  notes: string
  movement_date: string
}

export function StockMovementForm({
  movement,
  onSubmit,
  onCancel,
  isLoading,
}: StockMovementFormProps) {
  const { t } = useTranslation(['wines', 'common'])
  const form = useForm<StockMovementFormValues>({
    initialValues: {
      movement_type: movement?.movement_type || 'in',
      quantity: movement?.quantity || 1,
      notes: movement?.notes || '',
      movement_date: movement?.movement_date ? movement.movement_date : new Date().toISOString(),
    },
    validate: {
      quantity: (value) =>
        value > 0 ? null : t('wines:stockMovement.form.validation.quantityPositive'),
    },
  })

  return (
    <form onSubmit={form.onSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Stack gap="md" style={{ flex: 1, paddingBottom: '80px' }}>
        <SegmentedControl
          data={[
            { label: t('wines:stockMovement.form.movementType.in'), value: 'in' },
            { label: t('wines:stockMovement.form.movementType.out'), value: 'out' },
          ]}
          {...form.getInputProps('movement_type')}
        />

        <NumberInput
          label={t('wines:stockMovement.form.quantity')}
          placeholder={t('wines:stockMovement.form.quantityPlaceholder')}
          min={1}
          required
          {...form.getInputProps('quantity')}
        />

        <DatePickerInput
          label={t('wines:stockMovement.form.date')}
          placeholder={t('wines:stockMovement.form.datePlaceholder')}
          maxDate={new Date()}
          {...form.getInputProps('movement_date')}
        />

        <Textarea
          label={t('wines:stockMovement.form.notes')}
          placeholder={t('wines:stockMovement.form.notesPlaceholder')}
          description={t('wines:stockMovement.form.notesDescription')}
          minRows={3}
          {...form.getInputProps('notes')}
        />
      </Stack>

      <Group
        justify="flex-end"
        wrap="nowrap"
        mt="md"
        p="md"
        style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'var(--mantine-color-body)',
          borderTop: '1px solid var(--mantine-color-default-border)',
          zIndex: 100
        }}
      >
        {onCancel && (
          <Button variant="default" onClick={onCancel}>
            {t('common:buttons.cancel')}
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          {movement
            ? t('wines:stockMovement.form.buttons.updateMovement')
            : t('wines:stockMovement.form.buttons.addMovement')}
        </Button>
      </Group>
    </form>
  )
}
