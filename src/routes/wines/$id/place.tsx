import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import type { User } from '@supabase/supabase-js'
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Loader,
  Center,
  Paper,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Alert,
  ActionIcon,
  Badge,
} from '@mantine/core'
import { IconCheck, IconInfoCircle, IconPlus } from '@tabler/icons-react'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { useWine } from '../../../hooks/useWines'
import { useCellars, useAddCellar } from '../../../hooks/useCellars'
import {
  useWineLocations,
  useCreateShelf,
  usePlaceWine,
  useUnplaceWine,
  type SlotWithWine,
} from '../../../hooks/useWineLocations'
import { CellarVisualizer } from '../../../components/CellarVisualizer'
import { PageHeader } from '../../../components/PageHeader'
import type { BreadcrumbItem } from '../../../components/Breadcrumb'
import { useTranslation } from 'react-i18next'
import { RouteError } from '../../../components/RouteError'

export const Route = createFileRoute('/wines/$id/place')({
  component: PlaceWine,
  errorComponent: RouteError,
})

function PlaceWine() {
  const { t } = useTranslation(['wines', 'common'])
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wine, isLoading: wineLoading } = useWine(id)
  const { data: cellars, isLoading: cellarsLoading } = useCellars()
  const [selectedCellarId, setSelectedCellarId] = useState<string | null>(null)
  const effectiveCellarId = selectedCellarId ?? cellars?.[0]?.id ?? null
  const { data: slots } = useWineLocations(undefined, effectiveCellarId || undefined)
  const { data: allSlots } = useWineLocations()

  const placeWine = usePlaceWine()
  const unplaceWine = useUnplaceWine()
  const addCellar = useAddCellar()
  const createShelf = useCreateShelf()

  const [cellarModalOpened, { open: openCellarModal, close: closeCellarModal }] = useDisclosure(false)
  const [newCellarName, setNewCellarName] = useState('')

  const [shelfModalOpened, { open: openShelfModal, close: closeShelfModal }] = useDisclosure(false)
  const [newShelfRows, setNewShelfRows] = useState(2)
  const [newShelfColumns, setNewShelfColumns] = useState(6)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  const placedCount = useMemo(
    () => (allSlots ?? []).filter((s) => s.wine_id === id).length,
    [allSlots, id],
  )
  const totalQuantity = wine?.quantity ?? 0
  const unplacedCount = Math.max(0, totalQuantity - placedCount)

  const cellarOptions = useMemo(
    () => cellars?.map((c) => ({ value: c.id, label: c.name })) ?? [],
    [cellars],
  )

  const nextShelfNumber = useMemo(() => {
    if (!slots || slots.length === 0) return 1
    return Math.max(...slots.map((s) => s.shelf)) + 1
  }, [slots])

  const breadcrumbs = useMemo(
    (): BreadcrumbItem[] => [
      { label: t('common:breadcrumbs.home'), to: '/' },
      { label: t('common:breadcrumbs.myWines'), to: '/wines' },
      { label: wine?.name ?? '...', to: `/wines/${id}` },
      { label: t('wines:placeWine.breadcrumb'), to: undefined },
    ],
    [t, wine?.name, id],
  )

  const handleSlotClick = (slot: SlotWithWine) => {
    if (slot.wine_id === id) {
      unplaceWine.mutate({ slotId: slot.id })
    } else if (!slot.wine_id) {
      if (unplacedCount <= 0) return
      placeWine.mutate({ slotId: slot.id, wineId: id })
    }
  }

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

  const handleDone = () => navigate({ to: '/wines/$id', params: { id } })

  if (authLoading || wineLoading || cellarsLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    )
  }

  if (!user) return <Navigate to="/login" />

  if (!wine) {
    return (
      <Container size="lg">
        <Stack gap="lg">
          <PageHeader
            breadcrumbs={breadcrumbs}
            title={<Title order={1}>{t('wines:detail.notFound')}</Title>}
          />
        </Stack>
      </Container>
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

  const shelfModal = (
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
  )

  return (
    <Container size="xl">
      <Stack gap="lg">
        {cellarModal}
        {shelfModal}

        <PageHeader
          breadcrumbs={breadcrumbs}
          title={
            <div>
              <Title order={1}>{t('wines:placeWine.title', { name: wine.name })}</Title>
              <Text c="dimmed" size="lg">{t('wines:placeWine.subtitle')}</Text>
            </div>
          }
          actions={
            <Button leftSection={<IconCheck size={20} />} onClick={handleDone}>
              {t('wines:placeWine.done')}
            </Button>
          }
        />

        <Paper shadow="sm" p="md" withBorder>
          <Group gap="sm" wrap="wrap">
            <Badge color={unplacedCount === 0 ? 'green' : 'grape'} variant="light" size="lg">
              {t('wines:placeWine.progress', { placed: placedCount, total: totalQuantity })}
            </Badge>
            {unplacedCount === 0 && totalQuantity > 0 ? (
              <Text size="sm" c="dimmed">{t('wines:placeWine.allPlaced')}</Text>
            ) : unplacedCount > 0 ? (
              <Text size="sm" c="dimmed">{t('wines:placeWine.unplacedHint', { count: unplacedCount })}</Text>
            ) : null}
          </Group>
        </Paper>

        {!cellars || cellars.length === 0 ? (
          <Paper shadow="sm" p="xl" withBorder>
            <Stack align="center" gap="md">
              <Alert
                icon={<IconInfoCircle size={16} />}
                title={t('wines:overview.emptyTitle')}
                color="blue"
                variant="light"
                w="100%"
              >
                {t('wines:overview.emptyMessage')}
              </Alert>
              <Button leftSection={<IconPlus size={18} />} onClick={openCellarModal} size="md">
                {t('wines:form.buttons.addCellar')}
              </Button>
            </Stack>
          </Paper>
        ) : (
          <>
            <Paper shadow="sm" p="md" withBorder>
              <Group align="flex-end" gap="xs" wrap="nowrap">
                <Select
                  label={t('wines:form.labels.cellar')}
                  placeholder={t('wines:form.placeholders.cellar')}
                  data={cellarOptions}
                  value={effectiveCellarId}
                  onChange={setSelectedCellarId}
                  style={{ flex: 1, minWidth: 0, maxWidth: 300 }}
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
            </Paper>

            {effectiveCellarId && slots && (
              <CellarVisualizer
                cellarId={effectiveCellarId}
                slots={slots}
                placeMode={{ wineId: id }}
                onSlotClick={handleSlotClick}
                onAddShelf={openShelfModal}
              />
            )}
          </>
        )}
      </Stack>
    </Container>
  )
}
