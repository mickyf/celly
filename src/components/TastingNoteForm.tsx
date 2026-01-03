import { useForm } from '@mantine/form'
import { Textarea, Button, Stack, Rating, Group } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
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
  const form = useForm<TastingNoteFormValues>({
    initialValues: {
      rating: note?.rating || 3,
      notes: note?.notes || '',
      tasted_at: note?.tasted_at ? note.tasted_at : new Date().toISOString(),
    },
    validate: {
      rating: (value) =>
        value >= 1 && value <= 5 ? null : 'Rating must be between 1 and 5',
      notes: (value) => (value.trim().length > 0 ? null : 'Notes are required'),
    },

  })

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            Rating
          </label>
          <Rating size="xl" {...form.getInputProps('rating')} />
          {form.errors.rating && (
            <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
              {form.errors.rating}
            </div>
          )}
        </div>

        <DatePickerInput
          label="Tasting Date"
          placeholder="Pick date"
          maxDate={new Date()}
          {...form.getInputProps('tasted_at')}
        />

        <Textarea
          label="Tasting Notes"
          placeholder="Describe the wine's aroma, taste, body, finish..."
          description="Share your impressions and observations"
          minRows={4}
          required
          {...form.getInputProps('notes')}
        />

        <Group justify="flex-end" mt="md">
          {onCancel && (
            <Button variant="default" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isLoading}>
            {note ? 'Update Note' : 'Add Note'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
