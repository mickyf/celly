import { createFileRoute } from '@tanstack/react-router'
import {
  Text,
  Container,
  Stack,
  Select,
  Group,
  Loader,
  Center,
  Paper,
  Alert,
  Modal,
  Button,
  TextInput,
  NumberInput,
  ActionIcon,
} from '@mantine/core'
import { IconInfoCircle, IconPlus, IconMinus } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { useCellars, useAddCellar } from '../../hooks/useCellars'
import {
  useWineLocations,
  useCreateShelf,
  usePlaceWine,
  useAddSlots,
  useDeleteSlots,
  type SlotWithWine,
} from '../../hooks/useWineLocations'
import { useWines } from '../../hooks/useWines'
import { CellarVisualizer } from '../../components/CellarVisualizer'
import { PageHeader } from '../../components/PageHeader'

export const Route = createFileRoute('/cellars/')({
  component: CellarOverview,
})

function CellarOverview() {
  const { t } = useTranslation(['wines', 'common'])
  const { data: cellars, isLoading: cellarsLoading } = useCellars()
  const [selectedCellarId, setSelectedCellarId] = useState<string | null>(null)
  const effectiveCellarId = selectedCellarId ?? cellars?.[0]?.id ?? null
  const { data: slots } = useWineLocations(undefined, effectiveCellarId || undefined)
  const { data: wines } = useWines()
  const { data: allSlots } = useWineLocations()
  const addCellar = useAddCellar()
  const createShelf = useCreateShelf()
  const placeWine = usePlaceWine()
  const addSlots = useAddSlots()
  const deleteSlots = useDeleteSlots()

  const [cellarModalOpened, { open: openCellarModal, close: closeCellarModal }] = useDisclosure(false)
  const [newCellarName, setNewCellarName] = useState('')

  const [shelfModalOpened, { open: openShelfModal, close: closeShelfModal }] = useDisclosure(false)
  const [newShelfRows, setNewShelfRows] = useState(2)
  const [newShelfColumns, setNewShelfColumns] = useState(6)

  const [placeModalOpened, { open: openPlaceModal, close: closePlaceModal }] = useDisclosure(false)
  const [activeSlot, setActiveSlot] = useState<SlotWithWine | null>(null)
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null)

  const [editShelfModalOpened, { open: openEditShelfModal, close: closeEditShelfModal }] = useDisclosure(false)
  const [editingShelf, setEditingShelf] = useState<number | null>(null)

  const handleAddCellar = async () => {
    if (!newCellarName.trim()) return
    try {
      const result = await addCellar.mutateAsync({ name: newCellarName })
      setSelectedCellarId(result.id)
      setNewCellarName('')
      closeCellarModal()
    } catch {
      // handled in mutation onError
    }
  }

  const cellarOptions = useMemo(
    () =>
      cellars?.map((c) => ({
        value: c.id,
        label: c.name,
      })) || [],
    [cellars]
  )

  const occupiedCount = useMemo(
    () => slots?.filter((s) => s.wine_id).length || 0,
    [slots]
  )

  const nextShelfNumber = useMemo(() => {
    if (!slots || slots.length === 0) return 1
    return Math.max(...slots.map((s) => s.shelf)) + 1
  }, [slots])

  // Compute unplaced count per wine across the whole cellar inventory
  const unplacedByWine = useMemo(() => {
    if (!wines || !allSlots) return new Map<string, number>()
    const placed = new Map<string, number>()
    for (const slot of allSlots) {
      if (slot.wine_id) placed.set(slot.wine_id, (placed.get(slot.wine_id) ?? 0) + 1)
    }
    const result = new Map<string, number>()
    for (const wine of wines) {
      const placedCount = placed.get(wine.id) ?? 0
      const unplaced = (wine.quantity ?? 0) - placedCount
      if (unplaced > 0) result.set(wine.id, unplaced)
    }
    return result
  }, [wines, allSlots])

  const wineOptions = useMemo(() => {
    if (!wines) return []
    return wines
      .filter((w) => unplacedByWine.has(w.id))
      .map((w) => ({
        value: w.id,
        label: `${w.name}${w.vintage ? ` (${w.vintage})` : ''} — ${t('wines:overview.place.unplacedCount', { count: unplacedByWine.get(w.id) })}`,
      }))
  }, [wines, unplacedByWine, t])

  const handleSlotClick = (slot: SlotWithWine) => {
    setActiveSlot(slot)
    setSelectedWineId(null)
    openPlaceModal()
  }

  const handleCreateShelf = async () => {
    if (!effectiveCellarId) return
    try {
      await createShelf.mutateAsync({
        cellarId: effectiveCellarId,
        shelf: nextShelfNumber,
        rows: newShelfRows,
        columns: newShelfColumns,
      })
      closeShelfModal()
    } catch {
      // handled in mutation onError
    }
  }

  const handlePlaceWine = async (wineId: string | null) => {
    if (!activeSlot || !wineId) return
    closePlaceModal()
    try {
      await placeWine.mutateAsync({ slotId: activeSlot.id, wineId })
    } catch {
      // handled in mutation onError
    } finally {
      setActiveSlot(null)
      setSelectedWineId(null)
    }
  }

  const editingShelfSlots = useMemo(
    () => (editingShelf === null ? [] : (slots ?? []).filter((s) => s.shelf === editingShelf)),
    [slots, editingShelf]
  )
  const editingRows = editingShelfSlots.length > 0 ? Math.max(...editingShelfSlots.map((s) => s.row)) : 0
  const editingColumns = editingShelfSlots.length > 0 ? Math.max(...editingShelfSlots.map((s) => s.column)) : 0

  const handleOpenEditShelf = (shelf: number) => {
    setEditingShelf(shelf)
    openEditShelfModal()
  }

  const lastRowOccupied = editingShelfSlots.some((s) => s.row === editingRows && s.wine_id !== null)
  const lastColumnOccupied = editingShelfSlots.some((s) => s.column === editingColumns && s.wine_id !== null)

  const handleAddRow = () => {
    if (!effectiveCellarId || editingShelf === null) return
    const coords = Array.from({ length: editingColumns }, (_, i) => ({
      row: editingRows + 1,
      column: i + 1,
    }))
    addSlots.mutate({ cellarId: effectiveCellarId, shelf: editingShelf, coords })
  }

  const handleRemoveRow = () => {
    if (!effectiveCellarId || editingShelf === null || editingRows <= 1) return
    const ids = editingShelfSlots.filter((s) => s.row === editingRows).map((s) => s.id)
    deleteSlots.mutate({ slotIds: ids, cellarId: effectiveCellarId })
  }

  const handleAddColumn = () => {
    if (!effectiveCellarId || editingShelf === null) return
    const coords = Array.from({ length: editingRows }, (_, i) => ({
      row: i + 1,
      column: editingColumns + 1,
    }))
    addSlots.mutate({ cellarId: effectiveCellarId, shelf: editingShelf, coords })
  }

  const handleRemoveColumn = () => {
    if (!effectiveCellarId || editingShelf === null || editingColumns <= 1) return
    const ids = editingShelfSlots.filter((s) => s.column === editingColumns).map((s) => s.id)
    deleteSlots.mutate({ slotIds: ids, cellarId: effectiveCellarId })
  }

  if (cellarsLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    )
  }

  const cellarModal = (
    <Modal opened={cellarModalOpened} onClose={closeCellarModal} title={t('wines:form.buttons.addCellar')}>
      <Stack>
        <TextInput
          label={t('wines:form.labels.cellarName')}
          placeholder={t('wines:form.placeholders.cellarName')}
          value={newCellarName}
          onChange={(e) => setNewCellarName(e.currentTarget.value)}
          required
        />
        <Button onClick={handleAddCellar} loading={addCellar.isPending}>
          {t('common:buttons.save')}
        </Button>
      </Stack>
    </Modal>
  )

  if (!cellars || cellars.length === 0) {
    return (
      <Container size="xl">
        <Stack gap="lg">
          {cellarModal}
          <PageHeader
            title={t('wines:overview.title')}
            breadcrumbs={[{ label: t('common:breadcrumbs.home'), to: '/' }, { label: t('wines:overview.title') }]}
          />
          <Paper shadow="sm" p="xl" withBorder>
            <Stack align="center" gap="md">
              <Alert icon={<IconInfoCircle size={16} />} title={t('wines:overview.emptyTitle')} color="blue" variant="light" w="100%">
                {t('wines:overview.emptyMessage')}
              </Alert>
              <Button leftSection={<IconPlus size={18} />} onClick={openCellarModal} size="md">
                {t('wines:form.buttons.addCellar')}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        {cellarModal}

        {/* Add shelf modal */}
        <Modal opened={shelfModalOpened} onClose={closeShelfModal} title={t('wines:overview.addShelf')}>
          <Stack>
            <Text size="sm" c="dimmed">{t('wines:overview.shelfRowsColumnsHint')}</Text>
            <Group grow>
              <NumberInput
                label={t('wines:overview.rows')}
                min={1}
                max={50}
                value={newShelfRows}
                onChange={(v) => setNewShelfRows(typeof v === 'number' ? v : 1)}
              />
              <NumberInput
                label={t('wines:overview.columns')}
                min={1}
                max={50}
                value={newShelfColumns}
                onChange={(v) => setNewShelfColumns(typeof v === 'number' ? v : 1)}
              />
            </Group>
            <Button onClick={handleCreateShelf} loading={createShelf.isPending}>
              {t('common:buttons.save')}
            </Button>
          </Stack>
        </Modal>

        {/* Place wine modal */}
        <Modal opened={placeModalOpened} onClose={closePlaceModal} title={t('wines:overview.place.title')}>
          <Stack>
            {activeSlot && (
              <Text size="sm" c="dimmed">
                {t('wines:overview.place.subtitle', {
                  shelf: activeSlot.shelf,
                  row: activeSlot.row,
                  column: activeSlot.column,
                })}
              </Text>
            )}
            {wineOptions.length === 0 ? (
              <Alert color="blue" variant="light">{t('wines:overview.place.noUnplaced')}</Alert>
            ) : (
              <Select
                label={t('wines:overview.place.selectLabel')}
                placeholder={t('wines:overview.place.selectPlaceholder')}
                data={wineOptions}
                value={selectedWineId}
                onChange={(value) => {
                  setSelectedWineId(value)
                  handlePlaceWine(value)
                }}
                searchable
                required
              />
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={closePlaceModal}>
                {t('common:buttons.cancel')}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <PageHeader
          title={t('wines:overview.title')}
          breadcrumbs={[{ label: t('common:breadcrumbs.home'), to: '/' }, { label: t('wines:overview.title') }]}
        />

        <Paper shadow="sm" p="md" withBorder>
          <Group justify="space-between" align="flex-end">
            <Group align="flex-end">
              <Select
                label={t('wines:form.labels.cellar')}
                placeholder={t('wines:form.placeholders.cellar')}
                data={cellarOptions}
                value={effectiveCellarId}
                onChange={setSelectedCellarId}
                style={{ width: 300 }}
              />
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={openCellarModal}
                title={t('wines:form.buttons.addCellar')}
                aria-label={t('wines:form.buttons.addCellar')}
                mb={4}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
            <Stack gap={0} align="flex-end">
              <Text fw={700} size="xl">{occupiedCount} / {slots?.length ?? 0}</Text>
              <Text size="xs" c="dimmed">{t('common:plurals.bottle_other')}</Text>
            </Stack>
          </Group>
        </Paper>

        {/* Edit shelf modal */}
        <Modal
          opened={editShelfModalOpened}
          onClose={() => { closeEditShelfModal(); setEditingShelf(null) }}
          title={editingShelf !== null ? t('wines:overview.shelfNumber', { n: editingShelf }) : ''}
        >
          <Stack>
            <Text size="sm" c="dimmed">{t('wines:overview.shelfRowsColumnsHint')}</Text>
            <Group justify="space-between">
              <Text>{t('wines:overview.rows')}</Text>
              <Group gap="xs">
                <ActionIcon
                  variant="light"
                  onClick={handleRemoveRow}
                  disabled={editingRows <= 1 || lastRowOccupied}
                  loading={deleteSlots.isPending}
                  aria-label={t('common:buttons.delete')}
                >
                  <IconMinus size={16} />
                </ActionIcon>
                <Text fw={700} w={32} ta="center">{editingRows}</Text>
                <ActionIcon
                  variant="light"
                  onClick={handleAddRow}
                  loading={addSlots.isPending}
                  aria-label={t('common:buttons.add', { defaultValue: 'Add' })}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
            </Group>
            <Group justify="space-between">
              <Text>{t('wines:overview.columns')}</Text>
              <Group gap="xs">
                <ActionIcon
                  variant="light"
                  onClick={handleRemoveColumn}
                  disabled={editingColumns <= 1 || lastColumnOccupied}
                  loading={deleteSlots.isPending}
                  aria-label={t('common:buttons.delete')}
                >
                  <IconMinus size={16} />
                </ActionIcon>
                <Text fw={700} w={32} ta="center">{editingColumns}</Text>
                <ActionIcon
                  variant="light"
                  onClick={handleAddColumn}
                  loading={addSlots.isPending}
                  aria-label={t('common:buttons.add', { defaultValue: 'Add' })}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
            </Group>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => { closeEditShelfModal(); setEditingShelf(null) }}>
                {t('common:buttons.close')}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {effectiveCellarId && slots && (
          <CellarVisualizer
            cellarId={effectiveCellarId}
            slots={slots}
            onAddShelf={openShelfModal}
            onSlotClick={handleSlotClick}
            onEditShelf={handleOpenEditShelf}
          />
        )}
      </Stack>
    </Container>
  )
}
