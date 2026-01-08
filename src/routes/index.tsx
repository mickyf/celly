import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Group,
  SimpleGrid,
  Loader,
  Center,
  Badge,
  Button,
  Table,
  Rating,
  RingProgress,
} from '@mantine/core'
import {
  IconBottle,
  IconGlass,
  IconChefHat,
  IconCurrencyDollar,
  IconArrowRight,
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { useDashboardStats } from '../hooks/useDashboard'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: stats, isLoading } = useDashboardStats()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  if (authLoading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (isLoading || !stats) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
  }

  const readyPercentage = stats.totalWines > 0
    ? Math.round((stats.readyToDrink / stats.totalWines) * 100)
    : 0

  return (
    <Container size="lg">
      <Stack gap="xl">
        <div>
          <Title order={1}>{t('dashboard:title')}</Title>
          <Text c="dimmed" size="lg">
            {t('dashboard:subtitle')}
          </Text>
        </div>

        {/* Stats Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconBottle size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {t('dashboard:stats.totalBottles')}
                </Text>
                <Text size="xl" fw={700}>
                  <Link style={{ textDecoration: 'none', color: 'inherit' }} to="/wines" search={{}}>{stats.totalBottles}</Link>
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconBottle size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {t('dashboard:stats.uniqueWines')}
                </Text>
                <Text size="xl" fw={700}>
                  <Link style={{ textDecoration: 'none', color: 'inherit' }} to="/wines" search={{}}>{stats.totalWines}</Link>
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconCurrencyDollar size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {t('dashboard:stats.totalValue')}
                </Text>
                <Text size="xl" fw={700}>
                  CHF {stats.totalValue.toFixed(2)}
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconGlass size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {t('dashboard:stats.tastingNotes')}
                </Text>
                <Text size="xl" fw={700}>
                  {stats.tastingNotesCount}
                </Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Ready to Drink */}
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard:sections.readyToDrink')}
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {t('dashboard:readyCount', { count: stats.readyToDrink })}
                  </Text>
                </div>
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[{ value: readyPercentage, color: 'grape' }]}
                  label={
                    <Text size="xs" ta="center" fw={700}>
                      {readyPercentage}%
                    </Text>
                  }
                />
              </Group>
              <Text size="sm" c="dimmed">
                {t('dashboard:readyText', { count: stats.readyToDrink, total: stats.totalWines })}
              </Text>
              {stats.readyToDrink > 0 && (
                <Button
                  variant="light"
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => navigate({ to: '/wines', search: { drinkingWindow: 'ready' } })}
                >
                  {t('dashboard:quickActions.viewReady.button')}
                </Button>
              )}
            </Stack>
          </Paper>

          {/* Top Grapes */}
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md">
              <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                {t('dashboard:sections.topGrapes')}
              </Text>
              {stats.topGrapes.length > 0 ? (
                <Stack gap="xs">
                  {stats.topGrapes.map((item) => (
                    <Group key={item.grape} justify="space-between">
                      <Badge variant="light" size="lg">
                        {item.grape}
                      </Badge>
                      <Text size="sm" fw={500}>
                        {t('dashboard:grapeCount', { count: item.count })}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  {t('dashboard:noGrapes')}
                </Text>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Recent Tastings */}
        {stats.recentTastings.length > 0 && (
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                  {t('dashboard:sections.recentNotes')}
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => navigate({ to: '/wines', search: {} })}
                >
                  {t('dashboard:quickActions.viewAll.button')}
                </Button>
              </Group>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('dashboard:table.wine')}</Table.Th>
                    <Table.Th>{t('dashboard:table.rating')}</Table.Th>
                    <Table.Th>{t('dashboard:table.date')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {stats.recentTastings.map((tasting) => (
                    <Table.Tr key={tasting.id}>
                      <Table.Td>{tasting.wine_name}</Table.Td>
                      <Table.Td>
                        <Rating value={tasting.rating} readOnly size="sm" />
                      </Table.Td>
                      <Table.Td>{dayjs(tasting.tasted_at).format('DD.MM.YYYY')}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
        )}

        {/* Quick Actions */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md" align="center">
              <IconBottle size={48} stroke={1.5} />
              <Text size="lg" fw={700} ta="center">
                {t('dashboard:quickActions.addWine.title')}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {t('dashboard:quickActions.addWine.description')}
              </Text>
              <Button onClick={() => navigate({ to: '/wines/add' })}>
                {t('dashboard:quickActions.addWine.button')}
              </Button>
            </Stack>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md" align="center">
              <IconChefHat size={48} stroke={1.5} />
              <Text size="lg" fw={700} ta="center">
                {t('dashboard:quickActions.getPairing.title')}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {t('dashboard:quickActions.getPairing.description')}
              </Text>
              <Button onClick={() => navigate({ to: '/pairing' })}>
                {t('dashboard:quickActions.getPairing.button')}
              </Button>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
