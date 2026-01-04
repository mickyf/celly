import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Button, Stack, Group, SimpleGrid, Loader, Center, Modal } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useWines, useDeleteWine } from '../../hooks/useWines'
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
  const deleteWine = useDeleteWine()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [opened, { open, close }] = useDisclosure(false)

  const [filters, setFilters] = useState<WineFilterValues>({
    search: '',
    grapes: [],
    vintageMin: null,
    vintageMax: null,
    priceMin: null,
    priceMax: null,
    drinkingWindow: 'all',
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
      // Search filter
      if (filters.search && !wine.name.toLowerCase().includes(filters.search.toLowerCase())) {
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

      return true
    })
  }, [wines, filters])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.grapes.length > 0) count++
    if (filters.vintageMin !== null || filters.vintageMax !== null) count++
    if (filters.priceMin !== null || filters.priceMax !== null) count++
    if (filters.drinkingWindow !== 'all') count++
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
            <Button
              leftSection={<IconPlus size={20} />}
              onClick={() => navigate({ to: '/wines/add' })}
            >
              {t('wines:list.addButton')}
            </Button>
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
    </>
  )
}
