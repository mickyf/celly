import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Image,
  Button,
  Loader,
  Center,
  Modal,
  Paper,
  SimpleGrid,
} from '@mantine/core'
import {
  IconGlass,
  IconEdit,
  IconTrash,
  IconPlus,
  IconBottle,
  IconSparkles,
} from '@tabler/icons-react'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { useWine, useDeleteWine } from '../../../hooks/useWines'
import { useWinery } from '../../../hooks/useWineries'
import { useCellars } from '../../../hooks/useCellars'
import {
  useTastingNotes,
  useAddTastingNote,
  useUpdateTastingNote,
  useDeleteTastingNote,
} from '../../../hooks/useTastingNotes'
import {
  useStockMovements,
  useAddStockMovement,
} from '../../../hooks/useStockMovements'
import { useEnrichWine } from '../../../hooks/useWineEnrichment'
import { useDisclosure } from '@mantine/hooks'
import { TastingNoteForm, type TastingNoteFormValues } from '../../../components/TastingNoteForm'
import { TastingNoteCard } from '../../../components/TastingNoteCard'
import { StockMovementForm, type StockMovementFormValues } from '../../../components/StockMovementForm'
import { StockMovementHistory } from '../../../components/StockMovementHistory'
import { useTranslation } from 'react-i18next'
import { getCountryByCode } from '../../../constants/countries'
import type { Database } from '../../../types/database'
import { PageHeader } from '../../../components/PageHeader'
import { useMemo } from 'react'
import type { BreadcrumbItem } from '../../../components/Breadcrumb'

type TastingNote = Database['public']['Tables']['tasting_notes']['Row']

interface WineDetailSearch {
  from?: string
  wineryId?: string
  wineryName?: string
}

export const Route = createFileRoute('/wines/$id/')({
  component: WineDetail,
  validateSearch: (search: Record<string, unknown>): WineDetailSearch => {
    return {
      from: typeof search.from === 'string' ? search.from : undefined,
      wineryId: typeof search.wineryId === 'string' ? search.wineryId : undefined,
      wineryName: typeof search.wineryName === 'string' ? search.wineryName : undefined,
    }
  },
})

function WineDetail() {
  const { t } = useTranslation(['wines', 'common'])
  const { id } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wine, isLoading: wineLoading } = useWine(id)
  const { data: winery } = useWinery(wine?.winery_id || '')
  const { data: cellars } = useCellars()
  const { data: tastingNotes, isLoading: notesLoading } = useTastingNotes(id)
  const { data: stockMovements, isLoading: movementsLoading } = useStockMovements(id)
  const deleteWine = useDeleteWine()
  const addNote = useAddTastingNote()
  const updateNote = useUpdateTastingNote()
  const deleteNote = useDeleteTastingNote()
  const addStockMovement = useAddStockMovement()
  const enrichWine = useEnrichWine()

  // Get country information for winery
  const wineryCountry = useMemo(() => {
    return winery?.country_code ? getCountryByCode(winery.country_code, t) : null
  }, [winery?.country_code, t])

  // Generate breadcrumbs based on navigation context
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (!wine) return []

    // Cross-resource context: Coming from winery detail
    if (search.from === 'winery' && search.wineryId && search.wineryName) {
      return [
        { label: t('common:breadcrumbs.home'), to: '/' },
        { label: t('common:breadcrumbs.wineries'), to: '/wineries' },
        { label: search.wineryName, to: `/wineries/${search.wineryId}` },
        { label: wine.name, to: undefined }, // Current page
      ]
    }

    // Default wine path
    return [
      { label: t('common:breadcrumbs.home'), to: '/' },
      { label: t('common:breadcrumbs.myWines'), to: '/wines' },
      { label: wine.name, to: undefined }, // Current page
    ]
  }, [wine, search, t])

  const [deleteWineOpened, { open: openDeleteWine, close: closeDeleteWine }] =
    useDisclosure(false)
  const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] =
    useDisclosure(false)
  const [stockModalOpened, { open: openStockModal, close: closeStockModal }] =
    useDisclosure(false)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const [deleteNoteOpened, { open: openDeleteNote, close: closeDeleteNote }] =
    useDisclosure(false)
  const [editingNote, setEditingNote] = useState<TastingNote | null>(null)

  const cellar = useMemo(() => {
    if (!wine?.cellar_id || !cellars) return null
    return cellars.find(c => c.id === wine.cellar_id)
  }, [wine?.cellar_id, cellars])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  const handleDeleteWine = async () => {
    await deleteWine.mutateAsync(id)
    closeDeleteWine()
    navigate({ to: '/wines' })
  }

  const handleAddNote = async (values: TastingNoteFormValues) => {
    await addNote.mutateAsync({
      wine_id: id,
      user_id: '', // will be replaced later
      rating: values.rating,
      notes: values.notes,
      tasted_at: values.tasted_at,
    })
    closeNoteModal()
    setEditingNote(null)
  }

  const handleUpdateNote = async (values: TastingNoteFormValues) => {
    if (!editingNote) return

    await updateNote.mutateAsync({
      id: editingNote.id,
      rating: values.rating,
      notes: values.notes,
      tasted_at: values.tasted_at,
    })
    closeNoteModal()
    setEditingNote(null)
  }

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return

    await deleteNote.mutateAsync({ id: deleteNoteId, wineId: id })
    closeDeleteNote()
    setDeleteNoteId(null)
  }

  const openEditNote = (note: TastingNote) => {
    setEditingNote(note)
    openNoteModal()
  }

  const openDeleteNoteModal = (noteId: string) => {
    setDeleteNoteId(noteId)
    openDeleteNote()
  }

  const handleCloseNoteModal = () => {
    closeNoteModal()
    setEditingNote(null)
  }

  const handleAddStockMovement = async (values: StockMovementFormValues) => {
    await addStockMovement.mutateAsync({
      wine_id: id,
      user_id: '', // will be replaced in hook
      movement_type: values.movement_type,
      quantity: values.quantity,
      notes: values.notes,
      movement_date: values.movement_date,
    })
    closeStockModal()
  }

  const handleEnrichWine = async () => {
    if (!wine) return
    await enrichWine.mutateAsync({ wine })
  }

  // Calculate if enrichment is possible
  const canEnrich = wine && (
    !wine.grapes || wine.grapes.length === 0 ||
    wine.vintage === null ||
    wine.drink_window_start === null ||
    wine.drink_window_end === null ||
    wine.winery_id === null
  )

  if (authLoading || wineLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!wine) {
    return (
      <Container size="md">
        <Text c="red">{t('wines:detail.notFound')}</Text>
      </Container>
    )
  }

  const currentYear = new Date().getFullYear()
  const isReadyToDrink =
    wine.drink_window_start &&
    wine.drink_window_end &&
    currentYear >= wine.drink_window_start &&
    currentYear <= wine.drink_window_end

  return (
    <>
      <Container size="lg">
        <Stack gap="xl">
          {/* Page Header with Back Button and Breadcrumbs */}
          <PageHeader
            breadcrumbs={breadcrumbs}
            title={
              <div>
                <Group gap="sm">
                  <Title order={1}>{wine.name}</Title>
                  {isReadyToDrink && (
                    <Badge color="green" variant="light" size="lg">
                      {t('wines:detail.readyBadge')}
                    </Badge>
                  )}
                </Group>
                {wine.vintage && (
                  <Text c="dimmed" size="lg">
                    {t('common:labels.vintage')}: {wine.vintage}
                  </Text>
                )}
              </div>
            }
            actions={
              <Group>
                {canEnrich && (
                  <Button
                    variant="gradient"
                    gradient={{ from: 'grape', to: 'violet', deg: 90 }}
                    leftSection={<IconSparkles size={20} />}
                    onClick={handleEnrichWine}
                    loading={enrichWine.isPending}
                  >
                    {t('wines:enrichment.button')}
                  </Button>
                )}
                <Button
                  variant="light"
                  leftSection={<IconEdit size={20} />}
                  onClick={() => navigate({ to: '/wines/$id/edit', params: { id } })}
                >
                  {t('common:buttons.edit')}
                </Button>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={20} />}
                  onClick={openDeleteWine}
                >
                  {t('common:buttons.delete')}
                </Button>
              </Group>
            }
          />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {/* Wine Photo */}
            <Paper shadow="sm" p="lg" radius="md" withBorder>
              {wine.photo_url ? (
                <Image src={wine.photo_url} alt={wine.name} radius="md" />
              ) : (
                <Center h={300} style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <IconBottle size={80} stroke={1.5} color="#adb5bd" />
                </Center>
              )}
            </Paper>

            {/* Wine Details */}
            <Paper shadow="sm" p="lg" radius="md" withBorder>
              <Stack gap="md">
                <div>
                  <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                    {t('wines:detail.sections.grapeVarieties')}
                  </Text>
                  {wine.grapes && wine.grapes.length > 0 ? (
                    <Group gap="xs" mt="xs">
                      {wine.grapes.map((grape, index) => (
                        <Badge key={index} variant="light" size="lg">
                          {grape}
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed" mt="xs">
                      {t('wines:detail.notSpecified')}
                    </Text>
                  )}
                </div>

                {winery && (
                  <div>
                    <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                      Winery
                    </Text>
                    <Group mt="xs" gap="xs">
                      <Text size="lg">{winery.name}</Text>
                      {wineryCountry && (
                        <Text size="sm" c="dimmed">
                          {wineryCountry.flag}
                        </Text>
                      )}
                    </Group>
                  </div>
                )}

                <div>
                  <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                    {t('wines:detail.sections.quantity')}
                  </Text>
                  <Text size="lg" mt="xs">
                    {t('common:counts.bottles', { count: wine.quantity || 0 })}
                  </Text>
                </div>

                {wine.price && (
                  <div>
                    <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                      {t('wines:detail.sections.pricePerBottle')}
                    </Text>
                    <Text size="lg" mt="xs">
                      CHF {wine.price.toFixed(2)}
                    </Text>
                  </div>
                )}

                {wine.drink_window_start && wine.drink_window_end && (
                  <div>
                    <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                      {t('wines:detail.sections.drinkingWindow')}
                    </Text>
                    <Text size="lg" mt="xs">
                      {wine.drink_window_start} - {wine.drink_window_end}
                    </Text>
                  </div>
                )}

                {wine.food_pairings && (
                  <div>
                    <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                      {t('wines:detail.sections.foodPairings')}
                    </Text>
                    <Text size="sm" mt="xs" style={{ whiteSpace: 'pre-line' }}>
                      {wine.food_pairings}
                    </Text>
                  </div>
                )}

                {(cellar || wine.shelf || wine.row || wine.column) && (
                  <div>
                    <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                      {t('wines:form.sections.location')}
                    </Text>
                    <Group mt="xs" gap="xs">
                      {cellar && (
                        <Badge color="blue" variant="light" size="lg">
                          {cellar.name}
                        </Badge>
                      )}
                      {(wine.shelf || wine.row || wine.column) && (
                        <Text size="sm">
                          {[
                            wine.shelf && `${t('wines:form.labels.shelf')}: ${wine.shelf}`,
                            wine.row && `${t('wines:form.labels.row')}: ${wine.row}`,
                            wine.column && `${t('wines:form.labels.column')}: ${wine.column}`,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      )}
                    </Group>
                  </div>
                )}
              </Stack>
            </Paper>
          </SimpleGrid>

          {/* Stock History Section */}
          <div>
            <Group justify="space-between" mb="md">
              <Title order={2}>{t('wines:stockMovement.title')}</Title>
              <Button leftSection={<IconPlus size={20} />} onClick={openStockModal}>
                {t('wines:stockMovement.addMovement')}
              </Button>
            </Group>

            {movementsLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : (
              <StockMovementHistory
                movements={stockMovements || []}
                wineId={id}
              />
            )}
          </div>

          {/* Tasting Notes Section */}
          <div>
            <Group justify="space-between" mb="md">
              <Title order={2}>{t('wines:detail.sections.tastingNotes')}</Title>
              <Button leftSection={<IconPlus size={20} />} onClick={openNoteModal}>
                {t('wines:detail.sections.addTastingNote')}
              </Button>
            </Group>

            {notesLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : tastingNotes && tastingNotes.length > 0 ? (
              <Stack gap="md">
                {tastingNotes.map((note) => (
                  <TastingNoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => openEditNote(note)}
                    onDelete={() => openDeleteNoteModal(note.id)}
                  />
                ))}
              </Stack>
            ) : (
              <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack align="center" gap="md">
                  <IconGlass size={48} stroke={1.5} color="#adb5bd" />
                  <Text c="dimmed" ta="center">
                    {t('wines:detail.emptyNotes')}
                  </Text>
                  <Button onClick={openNoteModal}>{t('wines:detail.sections.addTastingNote')}</Button>
                </Stack>
              </Paper>
            )}
          </div>
        </Stack>
      </Container>

      {/* Delete Wine Modal */}
      <Modal
        opened={deleteWineOpened}
        onClose={closeDeleteWine}
        title={t('common:confirmDelete.title')}
        centered
      >
        <Stack>
          <Text>
            {t('wines:detail.confirmDelete')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteWine}>
              {t('common:confirmDelete.cancel')}
            </Button>
            <Button color="red" onClick={handleDeleteWine} loading={deleteWine.isPending}>
              {t('common:confirmDelete.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add/Edit Tasting Note Modal */}
      <Modal
        opened={noteModalOpened}
        onClose={handleCloseNoteModal}
        title={editingNote ? t('wines:detail.modalEdit') : t('wines:detail.modalAdd')}
        size="lg"
        centered
      >
        <TastingNoteForm
          wineId={id}
          note={editingNote || undefined}
          onSubmit={editingNote ? handleUpdateNote : handleAddNote}
          onCancel={handleCloseNoteModal}
          isLoading={addNote.isPending || updateNote.isPending}
        />
      </Modal>

      {/* Delete Tasting Note Modal */}
      <Modal
        opened={deleteNoteOpened}
        onClose={closeDeleteNote}
        title={t('common:confirmDelete.title')}
        centered
      >
        <Stack>
          <Text>{t('wines:detail.confirmDeleteNote')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteNote}>
              {t('common:confirmDelete.cancel')}
            </Button>
            <Button
              color="red"
              onClick={handleDeleteNote}
              loading={deleteNote.isPending}
            >
              {t('common:confirmDelete.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Stock Movement Modal */}
      <Modal
        opened={stockModalOpened}
        onClose={closeStockModal}
        title={t('wines:stockMovement.addMovement')}
        size="lg"
        centered
      >
        <StockMovementForm
          wineId={id}
          onSubmit={handleAddStockMovement}
          onCancel={closeStockModal}
          isLoading={addStockMovement.isPending}
        />
      </Modal>
    </>
  )
}
