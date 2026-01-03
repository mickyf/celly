import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
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
import dayjs from 'dayjs'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
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
          <Title order={1}>Dashboard</Title>
          <Text c="dimmed" size="lg">
            Welcome to your wine cellar
          </Text>
        </div>

        {/* Stats Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconBottle size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Bottles
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalBottles}
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconBottle size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Unique Wines
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalWines}
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconCurrencyDollar size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Value
                </Text>
                <Text size="xl" fw={700}>
                  ${stats.totalValue.toFixed(2)}
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group>
              <IconGlass size={32} stroke={1.5} />
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Tasting Notes
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
                    Ready to Drink
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stats.readyToDrink} wines
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
                {stats.readyToDrink} out of {stats.totalWines} wines are within their optimal
                drinking window
              </Text>
              {stats.readyToDrink > 0 && (
                <Button
                  variant="light"
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => navigate({ to: '/wines' })}
                >
                  View Ready Wines
                </Button>
              )}
            </Stack>
          </Paper>

          {/* Top Grapes */}
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md">
              <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                Top Grape Varieties
              </Text>
              {stats.topGrapes.length > 0 ? (
                <Stack gap="xs">
                  {stats.topGrapes.map((item) => (
                    <Group key={item.grape} justify="space-between">
                      <Badge variant="light" size="lg">
                        {item.grape}
                      </Badge>
                      <Text size="sm" fw={500}>
                        {item.count} {item.count === 1 ? 'wine' : 'wines'}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No wines with grape varieties yet
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
                  Recent Tasting Notes
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => navigate({ to: '/wines' })}
                >
                  View All Wines
                </Button>
              </Group>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Wine</Table.Th>
                    <Table.Th>Rating</Table.Th>
                    <Table.Th>Date</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {stats.recentTastings.map((tasting) => (
                    <Table.Tr key={tasting.id}>
                      <Table.Td>{tasting.wine_name}</Table.Td>
                      <Table.Td>
                        <Rating value={tasting.rating} readOnly size="sm" />
                      </Table.Td>
                      <Table.Td>{dayjs(tasting.tasted_at).format('MMM D, YYYY')}</Table.Td>
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
                Add Your First Wine
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Start building your collection
              </Text>
              <Button onClick={() => navigate({ to: '/wines/add' })}>Add Wine</Button>
            </Stack>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md" align="center">
              <IconChefHat size={48} stroke={1.5} />
              <Text size="lg" fw={700} ta="center">
                Find Perfect Pairing
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Let AI suggest wines for your menu
              </Text>
              <Button onClick={() => navigate({ to: '/pairing' })}>Get Pairing</Button>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
