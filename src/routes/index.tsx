import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { AuthSplash } from '../components/AuthSplash'
import type { User } from '@supabase/supabase-js'
import {
  ActionIcon,
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Group,
  SimpleGrid,
  Badge,
  Button,
  RingProgress,
} from '@mantine/core'
import {
  IconBottle,
  IconChefHat,
  IconCurrencyDollar,
  IconArrowRight,
  IconPlus,
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { useDashboardStats } from '../hooks/useDashboard'
import { useTranslation } from 'react-i18next'
import { DashboardStatsSkeleton } from '../components/skeletons'
import { ConsumptionChart } from '../components/ConsumptionChart'

// Stat cards navigate, so they are real links rather than divs with
// role="link": that buys keyboard activation on Enter *and* Space, middle-click
// and "open in new tab", and proper screen-reader link semantics.
// The router's own <Link> is used directly — Mantine's polymorphic
// `component={Link}` loses the typing of `search`, and createLink() in turn
// loses Mantine's own props.
const cardLinkSx = {
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
  flex: 1,
  minWidth: 0,
} as const

const badgeLinkSx = { textDecoration: 'none', cursor: 'pointer' } as const

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: stats, isLoading } = useDashboardStats()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  if (authLoading) {
    return <AuthSplash />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (isLoading || !stats) {
    return (
      <Container size="lg">
        <Stack gap="xl">
          <div>
            <Title order={1}>{t('dashboard:title')}</Title>
            <Text c="dimmed" size="lg">{t('dashboard:subtitle')}</Text>
          </div>
          <DashboardStatsSkeleton />
        </Stack>
      </Container>
    )
  }

  const readyPercentage = stats.totalWines > 0
    ? Math.round((stats.readyToDrink / stats.totalWines) * 100)
    : 0

  // No stopPropagation needed: the button is a sibling of the card's link, not
  // nested inside a click handler. ActionIcon is a real <button>, so Enter and
  // Space activate it natively — no onKeyDown of our own.
  const goToAdd = () => navigate({ to: '/wines/add' })

  return (
    <Container size="lg">
      <Stack gap="xl">
        <div>
          <Title order={1}>{t('dashboard:title')}</Title>
          <Text c="dimmed" size="lg">
            {t('dashboard:subtitle')}
          </Text>
        </div>

        {stats.totalWines === 0 && (
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
        )}

        {/* Stats Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              {/* The add button is a sibling of the link, never a child: a
                  <button> inside an <a> is invalid and traps keyboard users. */}
              <Link to="/wines" search={{}} style={cardLinkSx}>
                <Group wrap="nowrap">
                  <IconBottle size={32} stroke={1.5} />
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t('dashboard:stats.totalBottles')}
                    </Text>
                    <Text size="xl" fw={700}>
                      {stats.totalBottles}
                    </Text>
                  </div>
                </Group>
              </Link>
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label={t('common:actions.addWine')}
                onClick={goToAdd}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Link to="/wines" search={{}} style={cardLinkSx}>
                <Group wrap="nowrap">
                  <IconBottle size={32} stroke={1.5} />
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t('dashboard:stats.uniqueWines')}
                    </Text>
                    <Text size="xl" fw={700}>
                      {stats.totalWines}
                    </Text>
                  </div>
                </Group>
              </Link>
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label={t('common:actions.addWine')}
                onClick={goToAdd}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
          </Paper>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Link to="/wines" search={{}} style={cardLinkSx}>
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
            </Link>
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
                <Group gap="xs">
                  {stats.topGrapes.map((item) => (
                    <Link
                      key={item.grape}
                      to="/wines"
                      search={{ grapes: [item.grape] }}
                      style={badgeLinkSx}
                    >
                      <Badge
                        variant="light"
                        size="lg"
                        rightSection={
                          <Text size="xs" fw={700}>
                            {item.count}
                          </Text>
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        {item.grape}
                      </Badge>
                    </Link>
                  ))}
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  {t('dashboard:noGrapes')}
                </Text>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md" align="center" justify="center" h="100%">
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

          <ConsumptionChart data={stats.consumptionData} />
        </SimpleGrid>

      </Stack>
    </Container>
  )
}
