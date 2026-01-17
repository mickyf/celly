import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  SimpleGrid,
  Loader,
  Center,
  Modal,
  TextInput,
  Select,
} from '@mantine/core'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useWineries, useDeleteWinery, useMergeWineries } from '../../hooks/useWineries'
import { useWines } from '../../hooks/useWines'
import { WineryCard } from '../../components/WineryCard'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { getCountryByCode } from '../../constants/countries'

export const Route = createFileRoute('/wineries/')({
  component: WineryList,
})

function WineryList() {
  const { t } = useTranslation(['wineries', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wineries, isLoading } = useWineries()
  const { data: wines } = useWines()
  const deleteWinery = useDeleteWinery()
  const mergeWineries = useMergeWineries()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null)
  const [deleteOpened, deleteHandlers] = useDisclosure(false)
  const [mergeOpened, mergeHandlers] = useDisclosure(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  // Create wine count map per winery
  const wineryWineCountMap = useMemo(() => {
    if (!wines) return new Map<string, number>()
    const map = new Map<string, number>()

    for (const wine of wines) {
      if (wine.winery_id) {
        map.set(wine.winery_id, (map.get(wine.winery_id) || 0) + 1)
      }
    }
    return map
  }, [wines])

  // Filter wineries by search
  const filteredWineries = useMemo(() => {
    if (!wineries) return []
    if (!search) return wineries

    return wineries.filter((winery) =>
      winery.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [wineries, search])

  const handleDelete = (id: string) => {
    setDeleteId(id)
    deleteHandlers.open()
  }

  const confirmDelete = () => {
    if (deleteId) {
      deleteWinery.mutate(deleteId)
      deleteHandlers.close()
      setDeleteId(null)
    }
  }

  const handleMerge = (sourceId: string) => {
    setMergeSourceId(sourceId)
    setMergeTargetId(null)
    mergeHandlers.open()
  }

  const confirmMerge = () => {
    if (mergeSourceId && mergeTargetId) {
      mergeWineries.mutate(
        { sourceId: mergeSourceId, targetId: mergeTargetId },
        {
          onSuccess: () => {
            mergeHandlers.close()
            setMergeSourceId(null)
            setMergeTargetId(null)
          },
        }
      )
    }
  }

  // Get merge target options (exclude source winery)
  const mergeTargetOptions = useMemo(() => {
    if (!wineries || !mergeSourceId) return []
    return wineries
      .filter((w) => w.id !== mergeSourceId)
      .map((w) => {
        const country = w.country_code ? getCountryByCode(w.country_code, t) : null
        const wineCount = wineryWineCountMap.get(w.id) || 0
        return {
          value: w.id,
          label: `${w.name}${country ? ` (${country.flag} ${country.name})` : ''} - ${t('wineries:card.wineCount', { count: wineCount })}`,
        }
      })
  }, [wineries, mergeSourceId, wineryWineCountMap, t])

  const sourceWinery = useMemo(() => {
    if (!wineries || !mergeSourceId) return null
    return wineries.find((w) => w.id === mergeSourceId)
  }, [wineries, mergeSourceId])

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
              <Title order={1}>{t('wineries:list.title')}</Title>
              <Text c="dimmed" size="lg">
                {t('wineries:list.subtitle')}
              </Text>
            </div>
            <Button
              leftSection={<IconPlus size={20} />}
              onClick={() => navigate({ to: '/wineries/add' })}
            >
              {t('wineries:list.addButton')}
            </Button>
          </Group>

          {isLoading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : wineries && wineries.length > 0 ? (
            <>
              <TextInput
                placeholder={t('wineries:list.searchPlaceholder')}
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />

              {filteredWineries.length > 0 ? (
                <>
                  <Text size="sm" c="dimmed">
                    {t('wineries:list.showingCount', {
                      filtered: filteredWineries.length,
                      total: wineries.length,
                    })}
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {filteredWineries.map((winery) => (
                      <WineryCard
                        key={winery.id}
                        winery={winery}
                        wineCount={wineryWineCountMap.get(winery.id) || 0}
                        onView={() =>
                          navigate({ to: '/wineries/$id', params: { id: winery.id } })
                        }
                        onEdit={() =>
                          navigate({ to: '/wineries/$id/edit', params: { id: winery.id } })
                        }
                        onDelete={handleDelete}
                        onMerge={handleMerge}
                      />
                    ))}
                  </SimpleGrid>
                </>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  {t('wineries:list.noResults')}
                </Text>
              )}
            </>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              {t('wineries:list.emptyState')}
            </Text>
          )}
        </Stack>
      </Container>

      <Modal
        opened={deleteOpened}
        onClose={deleteHandlers.close}
        title={t('common:confirmDelete.title')}
        centered
      >
        <Stack>
          <Text>{t('wineries:detail.confirmDelete')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={deleteHandlers.close}>
              {t('common:confirmDelete.cancel')}
            </Button>
            <Button color="red" onClick={confirmDelete} loading={deleteWinery.isPending}>
              {t('common:confirmDelete.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={mergeOpened}
        onClose={mergeHandlers.close}
        title={t('wineries:merge.title')}
        centered
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {t('wineries:merge.description')}
          </Text>

          {sourceWinery && (
            <Text size="sm">
              <strong>{t('wineries:merge.source')}:</strong> {sourceWinery.name}{' '}
              ({t('wineries:card.wineCount', { count: wineryWineCountMap.get(sourceWinery.id) || 0 })})
            </Text>
          )}

          <Select
            label={t('wineries:merge.targetLabel')}
            placeholder={t('wineries:merge.targetPlaceholder')}
            data={mergeTargetOptions}
            value={mergeTargetId}
            onChange={(value) => setMergeTargetId(value)}
            searchable
            required
          />

          <Text size="xs" c="dimmed">
            {t('wineries:merge.warning')}
          </Text>

          <Group justify="flex-end">
            <Button variant="default" onClick={mergeHandlers.close}>
              {t('common:buttons.cancel')}
            </Button>
            <Button
              color="blue"
              onClick={confirmMerge}
              loading={mergeWineries.isPending}
              disabled={!mergeTargetId}
            >
              {t('wineries:merge.confirmButton')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
