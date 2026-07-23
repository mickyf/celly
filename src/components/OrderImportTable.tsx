import { useMemo } from 'react'
import {
  Table,
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  Stack,
  Badge,
  Text,
  ActionIcon,
  Tooltip,
  Combobox,
  useCombobox,
  InputBase,
} from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { BOTTLE_SIZES } from '../constants/bottleSizes'
import { getWineTypeOptions } from '../constants/wineTypes'
import type { ImportRow } from '../hooks/useOrderImport'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']
type Winery = Database['public']['Tables']['wineries']['Row']

interface OrderImportTableProps {
  rows: ImportRow[]
  onRowChange: (rowId: string, patch: Partial<ImportRow>) => void
  onRowRemove: (rowId: string) => void
  /** All wines — used for the existing-wine picker. */
  wines: Wine[]
  /** Existing wineries — used as Select options. */
  wineries: Winery[]
}

const NEW_WINERY_VALUE = '__new__'

interface WineRowComboboxProps {
  row: ImportRow
  wines: Wine[]
  disabled: boolean
  onChange: (patch: Partial<ImportRow>) => void
}

function WineNameCombobox({ row, wines, disabled, onChange }: WineRowComboboxProps) {
  const { t } = useTranslation('wines')
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  })

  const matchedWine = row.existingWineId
    ? wines.find((w) => w.id === row.existingWineId) ?? null
    : null

  // Display string: matched wine's full label, or the editable typed name.
  const inputValue = matchedWine
    ? matchedWine.name + (matchedWine.vintage ? ` (${matchedWine.vintage})` : '')
    : row.name

  // Filter options against the current input — suppress dropdown when nothing matches.
  const lowered = inputValue.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!lowered) return wines.slice(0, 50)
    return wines
      .filter((w) => w.name.toLowerCase().includes(lowered))
      .slice(0, 50)
  }, [wines, lowered])

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={(value) => {
        onChange({ existingWineId: value })
        combobox.closeDropdown()
      }}
      disabled={disabled}
    >
      <Combobox.Target>
        {matchedWine ? (
          // Match mode: show pinned wine, click X to revert to input mode.
          <InputBase
            component="button"
            type="button"
            pointer
            rightSection={
              !disabled && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange({ existingWineId: null })
                  }}
                  aria-label={t('import.review.clearMatch')}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              )
            }
            onClick={() => combobox.toggleDropdown()}
            disabled={disabled}
            title={inputValue}
            styles={{
              input: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'left',
              },
            }}
          >
            {inputValue}
          </InputBase>
        ) : (
          <TextInput
            size="sm"
            value={inputValue}
            onChange={(e) => {
              onChange({ name: e.currentTarget.value })
              combobox.openDropdown()
            }}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
            error={!inputValue.trim() ? t('import.review.errors.nameRequired') : undefined}
            disabled={disabled}
          />
        )}
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Header>
          <Text size="xs" c="dimmed">
            {t('import.review.pickExisting')}
          </Text>
        </Combobox.Header>
        <Combobox.Options mah={240} style={{ overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <Combobox.Empty>{t('import.review.noMatches')}</Combobox.Empty>
          ) : (
            filtered.map((w) => (
              <Combobox.Option value={w.id} key={w.id}>
                <Stack gap={0}>
                  <Text size="sm">
                    {w.name}
                    {w.vintage ? ` (${w.vintage})` : ''}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {w.bottle_size ?? ''}
                    {typeof w.quantity === 'number' ? ` · ${w.quantity}×` : ''}
                  </Text>
                </Stack>
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}

export function OrderImportTable({
  rows,
  onRowChange,
  onRowRemove,
  wines,
  wineries,
}: OrderImportTableProps) {
  const { t } = useTranslation(['wines', 'common'])

  const wineryOptions = useMemo(
    () => wineries.map((w) => ({ value: w.id, label: w.name })),
    [wineries],
  )

  const wineById = useMemo(() => new Map(wines.map((w) => [w.id, w])), [wines])

  const wineTypeOptions = useMemo(() => getWineTypeOptions(t), [t])

  const currentYear = new Date().getFullYear()

  return (
    <Table.ScrollContainer minWidth={900}>
      <Table withTableBorder withColumnBorders verticalSpacing="sm" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: 1, whiteSpace: 'nowrap' }} />
            <Table.Th style={{ width: '100%' }}>
              {t('wines:import.review.columns.name')}
            </Table.Th>
            <Table.Th style={{ width: 1, whiteSpace: 'nowrap' }}>
              {t('wines:import.review.columns.vintage')}
            </Table.Th>
            <Table.Th style={{ width: 1, whiteSpace: 'nowrap' }}>
              {t('wines:import.review.columns.type')}
            </Table.Th>
            <Table.Th style={{ width: 1, whiteSpace: 'nowrap' }}>
              {t('wines:import.review.columns.qty')}
            </Table.Th>
            <Table.Th>{t('wines:import.review.columns.price')}</Table.Th>
            <Table.Th>{t('wines:import.review.columns.bottle')}</Table.Th>
            <Table.Th>{t('wines:import.review.columns.winery')}</Table.Th>
            <Table.Th style={{ width: 1 }} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const matchedWine = row.existingWineId
              ? wineById.get(row.existingWineId) ?? null
              : null
            const isRestock = matchedWine !== null
            const dimmed = !row.included
            // Read-only fields are pinned to the matched wine when restocking.
            const vintageValue = matchedWine ? matchedWine.vintage : row.vintage
            const priceValue = matchedWine ? matchedWine.price : row.price
            const bottleValue = matchedWine ? matchedWine.bottle_size : row.bottleSize
            const typeValue = matchedWine ? matchedWine.wine_type : row.wineType

            const winerySelectOptions = (() => {
              if (row.winery && !row.winery.existingId && row.winery.newName) {
                // No "+ Create:" prefix — the "New" badge below the select makes intent clear.
                return [
                  { value: NEW_WINERY_VALUE, label: row.winery.newName },
                  ...wineryOptions,
                ]
              }
              return wineryOptions
            })()

            const winerySelectValue = (() => {
              if (matchedWine) return matchedWine.winery_id
              if (!row.winery) return null
              if (row.winery.existingId) return row.winery.existingId
              if (row.winery.newName) return NEW_WINERY_VALUE
              return null
            })()

            const wineryBadge = (() => {
              if (isRestock) return null
              if (!row.winery) return null
              if (row.winery.existingId) {
                return (
                  <Badge size="xs" color="gray" variant="light">
                    {t('wines:import.review.wineryBadges.existing')}
                  </Badge>
                )
              }
              if (row.winery.newName) {
                return (
                  <Badge size="xs" color="grape" variant="light">
                    {t('wines:import.review.wineryBadges.new')}
                  </Badge>
                )
              }
              return null
            })()

            return (
              <Table.Tr key={row.rowId} opacity={dimmed ? 0.55 : 1}>
                <Table.Td style={{ width: 1 }}>
                  <Checkbox
                    checked={row.included}
                    onChange={(e) =>
                      onRowChange(row.rowId, { included: e.currentTarget.checked })
                    }
                    aria-label={t('wines:import.review.includeRow')}
                  />
                </Table.Td>
                <Table.Td style={{ width: '100%' }}>
                  <Stack gap={4}>
                    <WineNameCombobox
                      row={row}
                      wines={wines}
                      disabled={!row.included}
                      onChange={(patch) => onRowChange(row.rowId, patch)}
                    />
                    {isRestock && (
                      <Badge size="xs" color="blue" variant="light">
                        {t('wines:import.review.restockBadge')}
                      </Badge>
                    )}
                  </Stack>
                </Table.Td>
                <Table.Td style={{ width: 1 }}>
                  <NumberInput
                    size="sm"
                    w={70}
                    value={vintageValue ?? ''}
                    onChange={(value) =>
                      onRowChange(row.rowId, {
                        vintage: typeof value === 'number' ? value : null,
                      })
                    }
                    min={1800}
                    max={currentYear + 1}
                    hideControls
                    disabled={!row.included || isRestock}
                  />
                </Table.Td>
                <Table.Td style={{ width: 1 }}>
                  <Select
                    size="sm"
                    w={110}
                    data={wineTypeOptions}
                    value={typeValue ?? null}
                    onChange={(value) => onRowChange(row.rowId, { wineType: value })}
                    clearable
                    disabled={!row.included || isRestock}
                  />
                </Table.Td>
                <Table.Td style={{ width: 1 }}>
                  <NumberInput
                    size="sm"
                    w={60}
                    value={row.quantity}
                    onChange={(value) =>
                      onRowChange(row.rowId, {
                        quantity: typeof value === 'number' && value >= 1 ? value : 1,
                      })
                    }
                    min={1}
                    hideControls
                    disabled={!row.included}
                  />
                </Table.Td>
                <Table.Td style={{ width: 1 }}>
                  <NumberInput
                    size="sm"
                    w={100}
                    value={priceValue ?? ''}
                    onChange={(value) =>
                      onRowChange(row.rowId, {
                        price: typeof value === 'number' ? value : null,
                      })
                    }
                    min={0}
                    max={9999.99}
                    decimalScale={2}
                    fixedDecimalScale
                    thousandSeparator="'"
                    hideControls
                    disabled={!row.included || isRestock}
                  />
                </Table.Td>
                <Table.Td style={{ width: 1 }}>
                  <Select
                    size="sm"
                    w={90}
                    data={[...BOTTLE_SIZES]}
                    value={bottleValue ?? null}
                    onChange={(value) => onRowChange(row.rowId, { bottleSize: value })}
                    clearable
                    disabled={!row.included || isRestock}
                  />
                </Table.Td>
                <Table.Td style={{ minWidth: 200 }}>
                  <Stack gap={4}>
                    <Select
                      size="sm"
                      data={winerySelectOptions}
                      value={winerySelectValue}
                      onChange={(value) => {
                        if (!value) {
                          onRowChange(row.rowId, { winery: null })
                          return
                        }
                        if (value === NEW_WINERY_VALUE) {
                          if (row.winery?.newName) {
                            onRowChange(row.rowId, {
                              winery: {
                                existingId: null,
                                newName: row.winery.newName,
                                newCountryCode: row.winery.newCountryCode,
                              },
                            })
                          }
                          return
                        }
                        onRowChange(row.rowId, {
                          winery: { existingId: value, newName: null, newCountryCode: null },
                        })
                      }}
                      clearable
                      searchable
                      disabled={!row.included || isRestock}
                    />
                    {wineryBadge}
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Tooltip label={t('common:buttons.delete', { defaultValue: 'Remove' })}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => onRowRemove(row.rowId)}
                      aria-label={t('common:buttons.delete', { defaultValue: 'Remove' })}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
