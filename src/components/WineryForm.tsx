import { useForm } from '@mantine/form'
import { TextInput, Button, Stack, Group, Paper, Select } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { COUNTRY_OPTIONS } from '../constants/countries'
import type { Tables } from '../types/database'

export interface WineryFormValues {
  name: string
  country_code: string | null
}

interface WineryFormProps {
  winery?: Tables<'wineries'>
  onSubmit: (values: WineryFormValues) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function WineryForm({
  winery,
  onSubmit,
  onCancel,
  isLoading,
}: WineryFormProps) {
  const { t } = useTranslation(['wineries', 'common'])

  const form = useForm<WineryFormValues>({
    initialValues: {
      name: winery?.name || '',
      country_code: winery?.country_code || null,
    },
    validate: {
      name: (value) =>
        value.trim().length > 0 ? null : t('wineries:form.validation.nameRequired'),
    },
  })

  return (
    <form onSubmit={form.onSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Stack gap="lg" style={{ flex: 1, paddingBottom: '80px' }}>
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <TextInput
              label={t('wineries:form.labels.wineryName')}
              placeholder={t('wineries:form.placeholders.wineryName')}
              required
              {...form.getInputProps('name')}
            />

            <Select
              label={t('wineries:form.labels.country')}
              placeholder={t('wineries:form.placeholders.country')}
              data={COUNTRY_OPTIONS}
              searchable
              clearable
              {...form.getInputProps('country_code')}
            />
          </Stack>
        </Paper>
      </Stack>

      <Group
        justify="flex-end"
        wrap="nowrap"
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
          {winery
            ? t('wineries:form.buttons.updateWinery')
            : t('wineries:form.buttons.addWinery')}
        </Button>
      </Group>
    </form>
  )
}
