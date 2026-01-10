import { useForm } from '@mantine/form'
import { Textarea, Button, Stack, Rating, Group } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'

type TastingNote = Database['public']['Tables']['tasting_notes']['Row']

interface TastingNoteFormProps {
  wineId: string
  note?: TastingNote
  onSubmit: (values: TastingNoteFormValues) => void
  onCancel?: () => void
  isLoading?: boolean
}

export interface TastingNoteFormValues {
  rating: number
  notes: string
  tasted_at: string
}

export function TastingNoteForm({
  note,
  onSubmit,
  onCancel,
  isLoading,
}: TastingNoteFormProps) {
  const { t } = useTranslation(['wines', 'common'])
  const form = useForm<TastingNoteFormValues>({
    initialValues: {
      rating: note?.rating || 3,
      notes: note?.notes || '',
      tasted_at: note?.tasted_at ? note.tasted_at : new Date().toISOString(),
    },
    validate: {
      rating: (value) =>
        value >= 1 && value <= 5 ? null : t('wines:tastingNote.form.validation.ratingRange'),
      notes: (value) => (value.trim().length > 0 ? null : t('wines:tastingNote.form.validation.notesRequired')),
    },

  })

  return (
    <form onSubmit={form.onSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Stack gap="md" style={{ flex: 1, paddingBottom: '80px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            {t('wines:tastingNote.form.rating')}
          </label>
          <Rating size="xl" {...form.getInputProps('rating')} />
          {form.errors.rating && (
            <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
              {form.errors.rating}
            </div>
          )}
        </div>

        <DatePickerInput
          label={t('wines:tastingNote.form.date')}
          placeholder={t('wines:tastingNote.form.datePlaceholder')}
          maxDate={new Date()}
          {...form.getInputProps('tasted_at')}
        />

        <Textarea
          label={t('wines:tastingNote.form.notes')}
          placeholder={t('wines:tastingNote.form.notesPlaceholder')}
          description={t('wines:tastingNote.form.notesDescription')}
          minRows={4}
          required
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
          {note ? t('wines:tastingNote.form.buttons.updateNote') : t('wines:tastingNote.form.buttons.addNote')}
        </Button>
      </Group>
    </form>
  )
}
