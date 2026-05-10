import {
  Paper,
  TextInput,
  Stack,
  Group,
  Button,
  MultiSelect,
  RangeSlider,
  Select,
  Collapse,
  Text,
  ActionIcon,
  Pill,
} from '@mantine/core'
import { IconSearch, IconFilter, IconX, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWineries } from '../hooks/useWineries'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

export interface WineFilterValues {
  search: string
  winery: string | null
  grapes: string[]
  bottleSizes: string[]
  vintageMin: number | null
  vintageMax: number | null
  priceMin: number | null
  priceMax: number | null
  drinkingWindow: 'all' | 'ready' | 'future' | 'past'
  dataCompleteness: 'all' | 'complete' | 'incomplete'
}

interface WineFiltersProps {
  wines: Wine[]
  filters: WineFilterValues
  onFiltersChange: (filters: WineFilterValues) => void
  activeFilterCount: number
}

export function WineFilters({ wines, filters, onFiltersChange, activeFilterCount }: WineFiltersProps) {
  const { t } = useTranslation(['wines', 'common'])
  const { data: wineries } = useWineries()
  const [opened, setOpened] = useState(false)

  // Extract unique grape varieties from all wines
  const allGrapes = Array.from(
    new Set(wines.flatMap((wine) => wine.grapes || []))
  ).sort()

  const grapeOptions = allGrapes.map((grape) => ({
    value: grape,
    label: grape,
  }))

  // Extract unique bottle sizes from all wines
  const allBottleSizes = Array.from(
    new Set(wines.map((wine) => wine.bottle_size).filter((size): size is string => size !== null && size !== undefined && size !== ''))
  ).sort()

  const bottleSizeOptions = allBottleSizes.map((size) => ({
    value: size,
    label: size,
  }))

  const wineryOptions = wineries?.map((winery) => ({
    value: winery.id,
    label: winery.name,
  })) || []

  const vintageValues = wines
    .map((w) => w.vintage)
    .filter((v): v is number => typeof v === 'number')
  const wineVintageMin = vintageValues.length > 0 ? Math.min(...vintageValues) : null
  const wineVintageMax = vintageValues.length > 0 ? Math.max(...vintageValues) : null

  const priceValues = wines
    .map((w) => w.price)
    .filter((p): p is number => typeof p === 'number')
  const winePriceMin = priceValues.length > 0 ? Math.min(...priceValues) : null
  const winePriceMax = priceValues.length > 0 ? Math.max(...priceValues) : null

  const handleReset = () => {
    onFiltersChange({
      search: '',
      winery: null,
      grapes: [],
      bottleSizes: [],
      vintageMin: null,
      vintageMax: null,
      priceMin: null,
      priceMax: null,
      drinkingWindow: 'all',
      dataCompleteness: 'all',
    })
  }

  const hasActiveFilters = activeFilterCount > 0

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  if (filters.search) {
    chips.push({
      key: 'search',
      label: `${t('wines:filters.activeChips.search')}: ${filters.search}`,
      onRemove: () => onFiltersChange({ ...filters, search: '' }),
    })
  }

  if (filters.winery) {
    const w = wineries?.find((x) => x.id === filters.winery)
    chips.push({
      key: 'winery',
      label: `${t('wines:filters.winery')}: ${w?.name ?? filters.winery}`,
      onRemove: () => onFiltersChange({ ...filters, winery: null }),
    })
  }

  filters.grapes.forEach((grape) => {
    chips.push({
      key: `grape-${grape}`,
      label: grape,
      onRemove: () =>
        onFiltersChange({ ...filters, grapes: filters.grapes.filter((g) => g !== grape) }),
    })
  })

  filters.bottleSizes.forEach((size) => {
    chips.push({
      key: `bottle-${size}`,
      label: size,
      onRemove: () =>
        onFiltersChange({ ...filters, bottleSizes: filters.bottleSizes.filter((s) => s !== size) }),
    })
  })

  if (filters.vintageMin !== null || filters.vintageMax !== null) {
    let value = ''
    if (filters.vintageMin !== null && filters.vintageMax !== null) {
      value = `${filters.vintageMin}–${filters.vintageMax}`
    } else if (filters.vintageMin !== null) {
      value = `≥ ${filters.vintageMin}`
    } else if (filters.vintageMax !== null) {
      value = `≤ ${filters.vintageMax}`
    }
    chips.push({
      key: 'vintage',
      label: `${t('wines:filters.vintageRange')}: ${value}`,
      onRemove: () => onFiltersChange({ ...filters, vintageMin: null, vintageMax: null }),
    })
  }

  if (filters.priceMin !== null || filters.priceMax !== null) {
    let value = ''
    if (filters.priceMin !== null && filters.priceMax !== null) {
      value = `CHF ${filters.priceMin}–${filters.priceMax}`
    } else if (filters.priceMin !== null) {
      value = `≥ CHF ${filters.priceMin}`
    } else if (filters.priceMax !== null) {
      value = `≤ CHF ${filters.priceMax}`
    }
    chips.push({
      key: 'price',
      label: `${t('wines:filters.priceRange')}: ${value}`,
      onRemove: () => onFiltersChange({ ...filters, priceMin: null, priceMax: null }),
    })
  }

  if (filters.drinkingWindow !== 'all') {
    chips.push({
      key: 'drinkingWindow',
      label: `${t('wines:filters.drinkingWindow')}: ${t(`wines:filters.drinkingWindowOptions.${filters.drinkingWindow}`)}`,
      onRemove: () => onFiltersChange({ ...filters, drinkingWindow: 'all' }),
    })
  }

  if (filters.dataCompleteness !== 'all') {
    chips.push({
      key: 'dataCompleteness',
      label: `${t('wines:filters.dataCompleteness')}: ${t(`wines:filters.dataCompletenessOptions.${filters.dataCompleteness}`)}`,
      onRemove: () => onFiltersChange({ ...filters, dataCompleteness: 'all' }),
    })
  }

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconFilter size={20} />
            <Text fw={600}>{t('wines:filters.title')}</Text>
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
              visibleFrom="sm"
            >
              {opened ? t('common:buttons.hideFilters') : t('common:buttons.showFilters')}
            </Button>
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => setOpened(!opened)}
              hiddenFrom="sm"
              aria-label={opened ? t('common:buttons.hideFilters') : t('common:buttons.showFilters')}
            >
              {opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>
        </Group>

        {chips.length > 0 && (
          <Group gap="xs">
            {chips.map((chip) => (
              <Pill
                key={chip.key}
                withRemoveButton
                onRemove={chip.onRemove}
                bg="grape.1"
                c="grape.9"
                removeButtonProps={{
                  'aria-label': t('common:buttons.removeFilter'),
                  'aria-hidden': false,
                  tabIndex: 0,
                }}
              >
                {chip.label}
              </Pill>
            ))}
          </Group>
        )}

        <TextInput
          placeholder={t('wines:filters.searchPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.currentTarget.value })
          }
        />

        <Collapse expanded={opened}>
          <Stack gap="md" mt="md">
            <Select
              label={t('wines:filters.winery')}
              placeholder={t('wines:filters.winerySelect')}
              data={wineryOptions}
              value={filters.winery}
              onChange={(value) => onFiltersChange({ ...filters, winery: value })}
              searchable
              clearable
            />

            <MultiSelect
              label={t('wines:filters.grapeVarieties')}
              placeholder={t('wines:filters.grapeSelect')}
              data={grapeOptions}
              value={filters.grapes}
              onChange={(value) => onFiltersChange({ ...filters, grapes: value })}
              searchable
              clearable
            />

            <MultiSelect
              label={t('wines:filters.bottleSize')}
              placeholder={t('wines:filters.bottleSizeSelect')}
              data={bottleSizeOptions}
              value={filters.bottleSizes}
              onChange={(value) => onFiltersChange({ ...filters, bottleSizes: value })}
              searchable
              clearable
            />

            {wineVintageMin !== null && wineVintageMax !== null && wineVintageMin !== wineVintageMax && (
              <div>
                <Text size="sm" fw={500} mb="xs">
                  {t('wines:filters.vintageRange')}
                </Text>
                <RangeSlider
                  min={Math.min(wineVintageMin, filters.vintageMin ?? wineVintageMin)}
                  max={Math.max(wineVintageMax, filters.vintageMax ?? wineVintageMax)}
                  step={1}
                  value={[
                    filters.vintageMin ?? wineVintageMin,
                    filters.vintageMax ?? wineVintageMax,
                  ]}
                  onChange={([min, max]) =>
                    onFiltersChange({
                      ...filters,
                      vintageMin: min === wineVintageMin ? null : min,
                      vintageMax: max === wineVintageMax ? null : max,
                    })
                  }
                  marks={[
                    { value: wineVintageMin, label: String(wineVintageMin) },
                    { value: wineVintageMax, label: String(wineVintageMax) },
                  ]}
                  mb="lg"
                />
              </div>
            )}

            {winePriceMin !== null && winePriceMax !== null && winePriceMin !== winePriceMax && (
              <div>
                <Text size="sm" fw={500} mb="xs">
                  {t('wines:filters.priceRange')}
                </Text>
                <RangeSlider
                  min={Math.min(winePriceMin, filters.priceMin ?? winePriceMin)}
                  max={Math.max(winePriceMax, filters.priceMax ?? winePriceMax)}
                  step={1}
                  value={[
                    filters.priceMin ?? winePriceMin,
                    filters.priceMax ?? winePriceMax,
                  ]}
                  onChange={([min, max]) =>
                    onFiltersChange({
                      ...filters,
                      priceMin: min === winePriceMin ? null : min,
                      priceMax: max === winePriceMax ? null : max,
                    })
                  }
                  label={(value) => `CHF ${value}`}
                  marks={[
                    { value: winePriceMin, label: `CHF ${winePriceMin}` },
                    { value: winePriceMax, label: `CHF ${winePriceMax}` },
                  ]}
                  mb="lg"
                />
              </div>
            )}

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

            <Select
              label={t('wines:filters.dataCompleteness')}
              placeholder={t('wines:filters.selectCompleteness')}
              data={[
                { value: 'all', label: t('wines:filters.dataCompletenessOptions.all') },
                { value: 'complete', label: t('wines:filters.dataCompletenessOptions.complete') },
                { value: 'incomplete', label: t('wines:filters.dataCompletenessOptions.incomplete') },
              ]}
              value={filters.dataCompleteness}
              onChange={(value) =>
                onFiltersChange({
                  ...filters,
                  dataCompleteness: (value as WineFilterValues['dataCompleteness']) || 'all',
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
