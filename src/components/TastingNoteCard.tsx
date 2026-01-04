import { Paper, Text, Rating, Group, Button, Stack } from '@mantine/core'
import { IconEdit, IconTrash, IconCalendar } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'
import dayjs from 'dayjs'

type TastingNote = Database['public']['Tables']['tasting_notes']['Row']

interface TastingNoteCardProps {
  note: TastingNote
  onEdit?: () => void
  onDelete?: () => void
}

export function TastingNoteCard({ note, onEdit, onDelete }: TastingNoteCardProps) {
  const { t } = useTranslation(['common'])
  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Rating value={note.rating} readOnly size="sm" />
          <Group gap="xs">
            <IconCalendar size={16} />
            <Text size="sm" c="dimmed">
              {dayjs(note.tasted_at).format('MMM D, YYYY')}
            </Text>
          </Group>
        </Group>

        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {note.notes}
        </Text>

        {(onEdit || onDelete) && (
          <Group justify="flex-end" gap="xs" mt="xs">
            {onEdit && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconEdit size={14} />}
                onClick={onEdit}
              >
                {t('common:buttons.edit')}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={onDelete}
              >
                {t('common:buttons.delete')}
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Paper>
  )
}
