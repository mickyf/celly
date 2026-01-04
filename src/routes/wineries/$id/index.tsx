import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Loader,
  Center,
  Modal,
  Paper,
  SimpleGrid,
} from '@mantine/core'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useWinery, useDeleteWinery } from '../../../hooks/useWineries'
import { useWines } from '../../../hooks/useWines'
import { WineCard } from '../../../components/WineCard'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { getCountryByCode } from '../../../constants/countries'

export const Route = createFileRoute('/wineries/$id/')({
  component: WineryDetail,
})

function WineryDetail() {
  const { t } = useTranslation(['wineries', 'common'])
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: winery, isLoading: wineryLoading } = useWinery(id)
  const { data: wines, isLoading: winesLoading } = useWines()
  const deleteWinery = useDeleteWinery()

  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  // Filter wines for this winery
  const wineryWines = useMemo(() => {
    if (!wines) return []
    return wines.filter((wine) => wine.winery_id === id)
  }, [wines, id])

  const handleDelete = async () => {
    await deleteWinery.mutateAsync(id)
    closeDelete()
    navigate({ to: '/wineries' })
  }

  if (authLoading || wineryLoading || winesLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!winery) {
    return (
      <Container size="lg">
        <Text>{t('wineries:detail.notFound')}</Text>
      </Container>
    )
  }

  const country = winery.country_code ? getCountryByCode(winery.country_code) : null
  const canDelete = wineryWines.length === 0

  return (
    <>
      <Container size="lg">
        <Stack gap="xl">
          <Group justify="space-between">
            <div>
              <Title order={1}>{winery.name}</Title>
              {country && (
                <Text c="dimmed" size="lg">
                  {country.flag} {country.name}
                </Text>
              )}
            </div>
            <Group>
              <Button
                leftSection={<IconEdit size={20} />}
                onClick={() => navigate({ to: '/wineries/$id/edit', params: { id } })}
              >
                {t('common:buttons.edit')}
              </Button>
              <Button
                color="red"
                leftSection={<IconTrash size={20} />}
                onClick={openDelete}
                disabled={!canDelete}
              >
                {t('common:buttons.delete')}
              </Button>
            </Group>
          </Group>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Stack gap="md">
              <div>
                <Text fw={700} size="lg" mb="xs">
                  {t('wineries:detail.sections.wines')}
                </Text>
                <Text size="sm" c="dimmed">
                  {t('wineries:card.wineCount', { count: wineryWines.length })}
                </Text>
              </div>

              {wineryWines.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                  {wineryWines.map((wine) => (
                    <WineCard
                      key={wine.id}
                      wine={wine}
                      onView={() => navigate({ to: '/wines/$id', params: { id: wine.id } })}
                      onEdit={() =>
                        navigate({ to: '/wines/$id/edit', params: { id: wine.id } })
                      }
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  {t('wineries:detail.emptyWines')}
                </Text>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <Modal opened={deleteOpened} onClose={closeDelete} title={t('common:confirmDelete.title')} centered>
        <Stack>
          <Text>{t('wineries:detail.confirmDelete')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>
              {t('common:confirmDelete.cancel')}
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleteWinery.isPending}>
              {t('common:confirmDelete.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
