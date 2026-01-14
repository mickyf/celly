import { useForm } from '@mantine/form'
import { TextInput, Button, Stack, Group, Paper, Select, ActionIcon, Tooltip } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { getCountryOptions } from '../constants/countries'
import type { Tables } from '../types/database'
import { useMemo, useState } from 'react'
import { enrichWineryData } from '../lib/claude'
import { notifications } from '@mantine/notifications'

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
  const [enriching, setEnriching] = useState(false)

  // Get translated country options
  const countryOptions = useMemo(() => getCountryOptions(t), [t])

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

  const handleEnrich = async () => {
    const name = form.values.name
    if (!name.trim()) return

    setEnriching(true)
    try {
      const { enrichmentData, error } = await enrichWineryData(name)

      if (error || !enrichmentData) {
        notifications.show({
          title: t('wineries:enrichment.error'),
          message: error || t('wineries:enrichment.noData'),
          color: 'red',
        })
        return
      }

      if (enrichmentData.countryCode) {
        form.setFieldValue('country_code', enrichmentData.countryCode)
        notifications.show({
          title: t('wineries:enrichment.success'),
          message: `${name} -> ${enrichmentData.countryCode}`,
          color: 'green',
        })
      }
    } catch (err) {
      console.error(err)
      notifications.show({
        title: t('wineries:enrichment.error'),
        message: String(err),
        color: 'red',
      })
    } finally {
      setEnriching(false)
    }
  }

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
              rightSection={
                form.values.name.trim().length > 0 && (
                  <Tooltip label={t('wineries:enrichment.button')}>
                    <ActionIcon
                      variant="light"
                      color="grape"
                      onClick={handleEnrich}
                      loading={enriching}
                      disabled={enriching}
                    >
                      <IconSparkles size={18} />
                    </ActionIcon>
                  </Tooltip>
                )
              }
            />

            <Select
              label={t('wineries:form.labels.country')}
              placeholder={t('wineries:form.placeholders.country')}
              data={countryOptions}
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
