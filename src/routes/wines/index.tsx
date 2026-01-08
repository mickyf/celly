import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Button, Stack, Group, SimpleGrid, Loader, Center, Modal, Progress } from '@mantine/core'
import { IconPlus, IconSparkles } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useWines, useDeleteWine } from '../../hooks/useWines'
import { useWineries } from '../../hooks/useWineries'
import { useBulkEnrichWines } from '../../hooks/useWineEnrichment'
import { WineCard } from '../../components/WineCard'
import { WineFilters, type WineFilterValues } from '../../components/WineFilters'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/wines/')({
  component: WineList,
})

function WineList() {
  const { t } = useTranslation(['wines', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wines, isLoading } = useWines()
  const { data: wineries } = useWineries()
  const deleteWine = useDeleteWine()
  const bulkEnrich = useBulkEnrichWines()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [opened, { open, close }] = useDisclosure(false)
  const [enrichModalOpened, { open: openEnrichModal, close: closeEnrichModal }] = useDisclosure(false)
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 })

  const [filters, setFilters] = useState<WineFilterValues>({
    search: '',
    winery: null,
    grapes: [],
    vintageMin: null,
    vintageMax: null,
    priceMin: null,
    priceMax: null,
    drinkingWindow: 'all',
    dataCompleteness: 'all',
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  // Filter wines based on filter criteria
  const filteredWines = useMemo(() => {
    if (!wines) return []

    const currentYear = new Date().getFullYear()

    return wines.filter((wine) => {
      // Search filter - search by wine name OR winery name
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const wineNameMatch = wine.name.toLowerCase().includes(searchLower)

        // Get winery name if wine has a winery
        const winery = wineries?.find((w) => w.id === wine.winery_id)
        const wineryNameMatch = winery?.name.toLowerCase().includes(searchLower)

        // Return false if neither wine name nor winery name match
        if (!wineNameMatch && !wineryNameMatch) {
          return false
        }
      }

      // Winery filter
      if (filters.winery && wine.winery_id !== filters.winery) {
        return false
      }

      // Grape filter
      if (filters.grapes.length > 0) {
        const hasMatchingGrape = filters.grapes.some((grape) =>
          wine.grapes?.includes(grape)
        )
        if (!hasMatchingGrape) return false
      }

      // Vintage filter
      if (filters.vintageMin !== null && wine.vintage && wine.vintage < filters.vintageMin) {
        return false
      }
      if (filters.vintageMax !== null && wine.vintage && wine.vintage > filters.vintageMax) {
        return false
      }

      // Price filter
      if (filters.priceMin !== null && wine.price && wine.price < filters.priceMin) {
        return false
      }
      if (filters.priceMax !== null && wine.price && wine.price > filters.priceMax) {
        return false
      }

      // Drinking window filter
      if (filters.drinkingWindow !== 'all') {
        if (!wine.drink_window_start || !wine.drink_window_end) {
          return false
        }

        const isReady =
          currentYear >= wine.drink_window_start && currentYear <= wine.drink_window_end
        const isFuture = currentYear < wine.drink_window_start
        const isPast = currentYear > wine.drink_window_end

        if (filters.drinkingWindow === 'ready' && !isReady) return false
        if (filters.drinkingWindow === 'future' && !isFuture) return false
        if (filters.drinkingWindow === 'past' && !isPast) return false
      }

      // Data completeness filter
      if (filters.dataCompleteness !== 'all') {
        const hasGrapes = wine.grapes && wine.grapes.length > 0
        const hasVintage = wine.vintage !== null
        const hasDrinkWindow = wine.drink_window_start !== null && wine.drink_window_end !== null
        const hasWinery = wine.winery_id !== null
        const hasPrice = wine.price !== null

        const isComplete = hasGrapes && hasVintage && hasDrinkWindow && hasWinery && hasPrice
        const isIncomplete = !hasGrapes || !hasVintage || !hasDrinkWindow || !hasWinery || !hasPrice

        if (filters.dataCompleteness === 'complete' && !isComplete) return false
        if (filters.dataCompleteness === 'incomplete' && !isIncomplete) return false
      }

      return true
    })
  }, [wines, wineries, filters])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.winery) count++
    if (filters.grapes.length > 0) count++
    if (filters.vintageMin !== null || filters.vintageMax !== null) count++
    if (filters.priceMin !== null || filters.priceMax !== null) count++
    if (filters.drinkingWindow !== 'all') count++
    if (filters.dataCompleteness !== 'all') count++
    return count
  }, [filters])

  const handleDelete = (id: string) => {
    setDeleteId(id)
    open()
  }

  const confirmDelete = () => {
    if (deleteId) {
      deleteWine.mutate(deleteId)
      close()
      setDeleteId(null)
    }
  }

  const handleBulkEnrich = () => {
    if (!wines) return

    // Filter wines that need enrichment
    const winesToEnrich = wines.filter((wine) => {
      const needsGrapes = !wine.grapes || wine.grapes.length === 0
      const needsVintage = wine.vintage === null
      const needsDrinkWindow = wine.drink_window_start === null || wine.drink_window_end === null
      const needsWinery = wine.winery_id === null
      const needsPrice = wine.price === null
      return needsGrapes || needsVintage || needsDrinkWindow || needsWinery || needsPrice
    })

    if (winesToEnrich.length === 0) {
      return
    }

    // Open progress modal and start enrichment
    setEnrichProgress({ current: 0, total: winesToEnrich.length })
    openEnrichModal()

    bulkEnrich.mutate({
      wines: winesToEnrich,
      onProgress: (current, total) => {
        setEnrichProgress({ current, total })
      },
    })
  }

  // Close modal when enrichment is done
  useEffect(() => {
    if (!bulkEnrich.isPending && enrichModalOpened) {
      // Small delay to show completion before closing
      const timer = setTimeout(() => {
        closeEnrichModal()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [bulkEnrich.isPending, enrichModalOpened, closeEnrichModal])

  // Count wines that need enrichment
  const winesNeedingEnrichment = useMemo(() => {
    if (!wines) return 0
    return wines.filter((wine) => {
      const needsGrapes = !wine.grapes || wine.grapes.length === 0
      const needsVintage = wine.vintage === null
      const needsDrinkWindow = wine.drink_window_start === null || wine.drink_window_end === null
      const needsWinery = wine.winery_id === null
      const needsPrice = wine.price === null
      return needsGrapes || needsVintage || needsDrinkWindow || needsWinery || needsPrice
    }).length
  }, [wines])

  if (authLoading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <>
      <Container size="lg">
        <Stack gap="xl">
          <Group justify="space-between">
            <div>
              <Title order={1}>{t('wines:list.title')}</Title>
              <Text c="dimmed" size="lg">
                {t('wines:list.subtitle')}
              </Text>
            </div>
            <Group>
              {wines && wines.length > 0 && winesNeedingEnrichment > 0 && (
                <Button
                  leftSection={<IconSparkles size={20} />}
                  onClick={handleBulkEnrich}
                  loading={bulkEnrich.isPending}
                  variant="light"
                  color="grape"
                >
                  {t('wines:bulkEnrichment.button', { count: winesNeedingEnrichment })}
                </Button>
              )}
              <Button
                leftSection={<IconPlus size={20} />}
                onClick={() => navigate({ to: '/wines/add' })}
              >
                {t('wines:list.addButton')}
              </Button>
            </Group>
          </Group>

          {isLoading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : wines && wines.length > 0 ? (
            <>
              <WineFilters
                wines={wines}
                filters={filters}
                onFiltersChange={setFilters}
                activeFilterCount={activeFilterCount}
              />

              {filteredWines.length > 0 ? (
                <>
                  <Text size="sm" c="dimmed">
                    {wines.length === 1
                      ? t('wines:list.showingCountSingle', { filtered: filteredWines.length, total: wines.length })
                      : t('wines:list.showingCount', { filtered: filteredWines.length, total: wines.length })
                    }
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {filteredWines.map((wine) => (
                      <WineCard
                        key={wine.id}
                        wine={wine}
                        onView={() => navigate({ to: '/wines/$id', params: { id: wine.id } })}
                        onEdit={() => navigate({ to: '/wines/$id/edit', params: { id: wine.id } })}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SimpleGrid>
                </>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  {t('wines:list.noResults')}
                </Text>
              )}
            </>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              {t('wines:list.emptyState')}
            </Text>
          )}
        </Stack>
      </Container>

      <Modal opened={opened} onClose={close} title={t('common:confirmDelete.title')} centered>
        <Stack>
          <Text>{t('wines:detail.confirmDelete')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t('common:confirmDelete.cancel')}
            </Button>
            <Button color="red" onClick={confirmDelete} loading={deleteWine.isPending}>
              {t('common:confirmDelete.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={enrichModalOpened}
        onClose={() => {}}
        title={t('wines:bulkEnrichment.progress.title')}
        centered
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('wines:bulkEnrichment.progress.message', {
              current: enrichProgress.current + 1,
              total: enrichProgress.total,
            })}
          </Text>
          <Progress
            value={enrichProgress.total > 0 ? ((enrichProgress.current + 1) / enrichProgress.total) * 100 : 0}
            size="lg"
            radius="md"
            animated
            color="grape"
          />
          <Text size="xs" c="dimmed" ta="center">
            {t('wines:bulkEnrichment.progress.pleaseWait')}
          </Text>
        </Stack>
      </Modal>
    </>
  )
}
