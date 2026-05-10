import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { AuthSplash } from '../components/AuthSplash'
import type { User } from '@supabase/supabase-js'
import {
  Container,
  Title,
  Text,
  Textarea,
  Button,
  Stack,
  Paper,
  Badge,
  Group,
  Progress,
  Alert,
  Loader,
  Center,
  ActionIcon,
  Divider,
} from '@mantine/core'
import {
  IconChefHat,
  IconSparkles,
  IconInfoCircle,
  IconBottle,
  IconArrowRight,
  IconRefresh,
  IconHistory,
  IconTrash,
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import { useWines } from '../hooks/useWines'
import { useFoodPairing } from '../hooks/useFoodPairing'
import { useTranslation } from 'react-i18next'
import {
  addPairingEntry,
  clearPairingHistory,
  findCachedPairing,
  loadPairingHistory,
  savePairingHistory,
  type PairingHistoryEntry,
} from '../lib/pairingHistory'

export const Route = createFileRoute('/pairing')({
  component: FoodPairing,
})

function formatRelativeTime(timestamp: number, locale: string, now: number = Date.now()): string {
  const diffMs = timestamp - now
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const minutes = Math.round(diffMs / 60000)
  const hours = Math.round(diffMs / 3600000)
  const days = Math.round(diffMs / 86400000)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(days, 'day')
}

function FoodPairing() {
  const { t, i18n } = useTranslation(['pairing', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [menu, setMenu] = useState('')
  const [history, setHistory] = useState<PairingHistoryEntry[]>(() => loadPairingHistory())
  const [activeEntry, setActiveEntry] = useState<PairingHistoryEntry | null>(null)
  const [resultsFromCache, setResultsFromCache] = useState(false)

  const { data: wines, isLoading: winesLoading } = useWines()
  const pairingMutation = useFoodPairing()

  // Drunken wines are never pairable. Within those, prefer ones in the
  // drinking window; if none qualify, fall back to all available wines.
  const pairableWines = useMemo(() => {
    if (!wines) return []
    const available = wines.filter((w) => (w.quantity ?? 0) > 0)
    const currentYear = new Date().getFullYear()
    const inWindow = available.filter(
      (w) =>
        !w.drink_window_start ||
        !w.drink_window_end ||
        (currentYear >= w.drink_window_start && currentYear <= w.drink_window_end),
    )
    return inWindow.length > 0 ? inWindow : available
  }, [wines])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  const handleGetPairing = async (force = false) => {
    if (pairableWines.length === 0) return

    const language = i18n.language as 'en' | 'de-CH'
    const wineIds = pairableWines.map((w) => w.id)

    if (!force) {
      const cached = findCachedPairing(history, { menu, wineIds, language })
      if (cached) {
        setActiveEntry(cached)
        setResultsFromCache(true)
        return
      }
    }

    const result = await pairingMutation.mutateAsync({
      menu,
      wines: pairableWines,
      language,
    })

    const updated = addPairingEntry(history, {
      menu,
      wineIds,
      language,
      recommendations: result.recommendations,
    })
    setHistory(updated)
    savePairingHistory(updated)
    setActiveEntry(updated[0])
    setResultsFromCache(false)
  }

  const handleReplay = (entry: PairingHistoryEntry) => {
    setMenu(entry.menu)
    setActiveEntry(entry)
    setResultsFromCache(false)
  }

  const handleClearHistory = () => {
    clearPairingHistory()
    setHistory([])
    setActiveEntry(null)
    setResultsFromCache(false)
  }

  const recommendations = activeEntry?.recommendations ?? []

  if (authLoading) {
    return <AuthSplash />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (winesLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (!wines || wines.length === 0) {
    return (
      <Container size="md">
        <Stack gap="xl">
          <div>
            <Title order={1}>{t('pairing:title')}</Title>
            <Text c="dimmed" size="lg">
              {t('pairing:subtitle')}
            </Text>
          </div>

          <Alert
            variant="light"
            color="blue"
            title={t('pairing:emptyState.title')}
            icon={<IconInfoCircle />}
          >
            <Stack gap="sm">
              <Text size="sm">
                {t('pairing:emptyState.message')}
              </Text>
              <Button
                size="sm"
                leftSection={<IconBottle size={16} />}
                onClick={() => navigate({ to: '/wines/add' })}
              >
                {t('pairing:buttons.addFirstWine')}
              </Button>
            </Stack>
          </Alert>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="md">
      <Stack gap="xl">
        <div>
          <Title order={1}>{t('pairing:title')}</Title>
          <Text c="dimmed" size="lg">
            {t('pairing:subtitle')}
          </Text>
        </div>

        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack>
            <Textarea
              label={t('pairing:form.label')}
              placeholder={t('pairing:form.placeholder')}
              description={t('pairing:form.description')}
              minRows={4}
              value={menu}
              onChange={(e) => setMenu(e.currentTarget.value)}
            />
            <Group gap="xs">
              <Button
                leftSection={
                  pairingMutation.isPending ? (
                    <Loader size={20} color="white" />
                  ) : (
                    <IconSparkles size={20} />
                  )
                }
                disabled={!menu.trim() || pairingMutation.isPending}
                size="lg"
                onClick={() => handleGetPairing(false)}
                loading={pairingMutation.isPending}
                style={{ flex: 1 }}
              >
                {pairingMutation.isPending ? t('pairing:buttons.analyzing') : t('pairing:buttons.getPairing')}
              </Button>
              {activeEntry && (
                <ActionIcon
                  variant="light"
                  size="xl"
                  onClick={() => handleGetPairing(true)}
                  disabled={!menu.trim() || pairingMutation.isPending}
                  aria-label={t('pairing:buttons.refresh')}
                  title={t('pairing:buttons.refresh')}
                >
                  <IconRefresh size={20} />
                </ActionIcon>
              )}
            </Group>

            <Text size="sm" c="dimmed">
              {t('pairing:wineCount', { count: pairableWines.length })}
            </Text>
          </Stack>
        </Paper>

        {recommendations.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group>
                <IconChefHat size={24} stroke={1.5} />
                <Text size="lg" fw={700}>
                  {t('pairing:results.title')}
                </Text>
              </Group>
              {activeEntry && (
                <Badge variant="light" color={resultsFromCache ? 'blue' : 'gray'}>
                  {resultsFromCache
                    ? t('pairing:cache.fromCache')
                    : formatRelativeTime(activeEntry.createdAt, i18n.language)}
                </Badge>
              )}
            </Group>

            {recommendations.map((rec) => (
              <Paper key={rec.wineId} shadow="sm" p="xl" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group gap="sm" mb="xs">
                        <Badge size="lg" variant="filled" color="grape">
                          {t('pairing:results.rank', { rank: rec.rank })}
                        </Badge>
                        <Badge size="lg" variant="light" color="green">
                          {t('pairing:results.match', { score: rec.pairingScore })}
                        </Badge>
                      </Group>
                      <Title order={3}>
                        {rec.wineName}
                        {rec.vintage && ` (${rec.vintage})`}
                      </Title>
                      {rec.grapes.length > 0 && (
                        <Group gap="xs" mt="xs">
                          {rec.grapes.map((grape, idx) => (
                            <Badge key={idx} variant="light" size="sm">
                              {grape}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </div>
                    <Button
                      variant="light"
                      size="sm"
                      rightSection={<IconArrowRight size={16} />}
                      onClick={() =>
                        navigate({ to: '/wines/$id', params: { id: rec.wineId } })
                      }
                    >
                      {t('pairing:buttons.viewWine')}
                    </Button>
                  </Group>

                  <Progress value={rec.pairingScore} color="grape" size="sm" />

                  <Paper bg="gray.0" p="md" radius="sm">
                    <Text size="sm" fw={600} mb="xs">
                      {t('pairing:results.whyLabel')}
                    </Text>
                    <Text size="sm" style={{ lineHeight: 1.6 }}>
                      {rec.explanation}
                    </Text>
                  </Paper>
                </Stack>
              </Paper>
            ))}

            <Button variant="subtle" onClick={() => setActiveEntry(null)}>
              {t('pairing:buttons.clearResults')}
            </Button>
          </Stack>
        )}

        {history.length > 0 && (
          <>
            <Divider />
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="xs">
                  <IconHistory size={20} />
                  <Text fw={600}>{t('pairing:history.title')}</Text>
                </Group>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleClearHistory}
                >
                  {t('pairing:history.clearAll')}
                </Button>
              </Group>
              <Stack gap="xs">
                {history.map((entry) => (
                  <Paper
                    key={entry.id}
                    p="sm"
                    radius="md"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      borderColor:
                        activeEntry?.id === entry.id ? 'var(--mantine-color-grape-4)' : undefined,
                    }}
                    onClick={() => handleReplay(entry)}
                  >
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                        {entry.menu}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(entry.createdAt, i18n.language)}
                      </Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  )
}
