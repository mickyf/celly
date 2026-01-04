import {
  Paper,
  TextInput,
  Stack,
  Group,
  Button,
  MultiSelect,
  NumberInput,
  Select,
  Collapse,
  Text,
  Badge,
} from '@mantine/core'
import { IconSearch, IconFilter, IconX, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

export interface WineFilterValues {
  search: string
  grapes: string[]
  vintageMin: number | null
  vintageMax: number | null
  priceMin: number | null
  priceMax: number | null
  drinkingWindow: 'all' | 'ready' | 'future' | 'past'
}

interface WineFiltersProps {
  wines: Wine[]
  filters: WineFilterValues
  onFiltersChange: (filters: WineFilterValues) => void
  activeFilterCount: number
}

export function WineFilters({ wines, filters, onFiltersChange, activeFilterCount }: WineFiltersProps) {
  const { t } = useTranslation(['wines', 'common'])
  const [opened, setOpened] = useState(false)

  // Extract unique grape varieties from all wines
  const allGrapes = Array.from(
    new Set(wines.flatMap((wine) => wine.grapes || []))
  ).sort()

  const grapeOptions = allGrapes.map((grape) => ({
    value: grape,
    label: grape,
  }))

  const handleReset = () => {
    onFiltersChange({
      search: '',
      grapes: [],
      vintageMin: null,
      vintageMax: null,
      priceMin: null,
      priceMax: null,
      drinkingWindow: 'all',
    })
  }

  const hasActiveFilters = activeFilterCount > 0

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconFilter size={20} />
            <Text fw={600}>{t('wines:filters.title')}</Text>
            {hasActiveFilters && (
              <Badge size="sm" variant="filled" color="grape">
                {t('wines:filters.activeCount', { count: activeFilterCount })}
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            {hasActiveFilters && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconX size={14} />}
                onClick={handleReset}
              >
                {t('common:buttons.clearAll')}
              </Button>
            )}
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setOpened(!opened)}
              rightSection={opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            >
              {opened ? t('common:buttons.hideFilters') : t('common:buttons.showFilters')}
            </Button>
          </Group>
        </Group>

        <TextInput
          placeholder={t('wines:filters.searchPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.currentTarget.value })
          }
        />

        <Collapse in={opened}>
          <Stack gap="md" mt="md">
            <MultiSelect
              label={t('wines:filters.grapeVarieties')}
              placeholder={t('wines:filters.grapeSelect')}
              data={grapeOptions}
              value={filters.grapes}
              onChange={(value) => onFiltersChange({ ...filters, grapes: value })}
              searchable
              clearable
            />

            <div>
              <Text size="sm" fw={500} mb="xs">
                {t('wines:filters.vintageRange')}
              </Text>
              <Group grow>
                <NumberInput
                  placeholder={t('wines:filters.from')}
                  min={1900}
                  max={new Date().getFullYear() + 10}
                  value={filters.vintageMin ?? ''}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      vintageMin: typeof value === 'number' ? value : null,
                    })
                  }
                />
                <NumberInput
                  placeholder={t('wines:filters.to')}
                  min={1900}
                  max={new Date().getFullYear() + 10}
                  value={filters.vintageMax ?? ''}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      vintageMax: typeof value === 'number' ? value : null,
                    })
                  }
                />
              </Group>
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">
                {t('wines:filters.priceRange')}
              </Text>
              <Group grow>
                <NumberInput
                  placeholder={t('wines:filters.min')}
                  prefix="$"
                  decimalScale={2}
                  min={0}
                  value={filters.priceMin ?? ''}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      priceMin: typeof value === 'number' ? value : null,
                    })
                  }
                />
                <NumberInput
                  placeholder={t('wines:filters.max')}
                  prefix="$"
                  decimalScale={2}
                  min={0}
                  value={filters.priceMax ?? ''}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      priceMax: typeof value === 'number' ? value : null,
                    })
                  }
                />
              </Group>
            </div>

            <Select
              label={t('wines:filters.drinkingWindow')}
              placeholder={t('wines:filters.selectStatus')}
              data={[
                { value: 'all', label: t('wines:filters.drinkingWindowOptions.all') },
                { value: 'ready', label: t('wines:filters.drinkingWindowOptions.ready') },
                { value: 'future', label: t('wines:filters.drinkingWindowOptions.future') },
                { value: 'past', label: t('wines:filters.drinkingWindowOptions.past') },
              ]}
              value={filters.drinkingWindow}
              onChange={(value) =>
                onFiltersChange({
                  ...filters,
                  drinkingWindow: (value as WineFilterValues['drinkingWindow']) || 'all',
                })
              }
              clearable={false}
            />
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  )
}
