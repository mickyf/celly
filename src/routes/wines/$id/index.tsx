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
import {
  useTastingNotes,
  useAddTastingNote,
  useUpdateTastingNote,
  useDeleteTastingNote,
} from '../../../hooks/useTastingNotes'
import { useEnrichWine } from '../../../hooks/useWineEnrichment'
import { useDisclosure } from '@mantine/hooks'
import { TastingNoteForm, type TastingNoteFormValues } from '../../../components/TastingNoteForm'
import { TastingNoteCard } from '../../../components/TastingNoteCard'
import { useTranslation } from 'react-i18next'
import { getCountryByCode } from '../../../constants/countries'
import type { Database } from '../../../types/database'

type TastingNote = Database['public']['Tables']['tasting_notes']['Row']

export const Route = createFileRoute('/wines/$id/')({
  component: WineDetail,
})

function WineDetail() {
  const { t } = useTranslation(['wines', 'common'])
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wine, isLoading: wineLoading } = useWine(id)
  const { data: winery } = useWinery(wine?.winery_id || '')
  const { data: tastingNotes, isLoading: notesLoading } = useTastingNotes(id)
  const deleteWine = useDeleteWine()
  const addNote = useAddTastingNote()
  const updateNote = useUpdateTastingNote()
  const deleteNote = useDeleteTastingNote()
  const enrichWine = useEnrichWine()

  const [deleteWineOpened, { open: openDeleteWine, close: closeDeleteWine }] =
    useDisclosure(false)
  const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] =
    useDisclosure(false)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const [deleteNoteOpened, { open: openDeleteNote, close: closeDeleteNote }] =
    useDisclosure(false)
  const [editingNote, setEditingNote] = useState<TastingNote | null>(null)

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
          {/* Wine Header */}
          <Group justify="space-between">
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
          </Group>

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
                      {winery.country_code && (
                        <Text size="sm" c="dimmed">
                          {getCountryByCode(winery.country_code)?.flag}
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
                      ${wine.price.toFixed(2)}
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
              </Stack>
            </Paper>
          </SimpleGrid>

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
    </>
  )
}
