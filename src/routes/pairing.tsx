import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
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
} from '@mantine/core'
import {
  IconChefHat,
  IconSparkles,
  IconInfoCircle,
  IconBottle,
  IconArrowRight,
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { useWines } from '../hooks/useWines'
import { useFoodPairing } from '../hooks/useFoodPairing'
import { useTranslation } from 'react-i18next'
import type { PairingRecommendation } from '../lib/claude'

export const Route = createFileRoute('/pairing')({
  component: FoodPairing,
})

function FoodPairing() {
  const { t } = useTranslation(['pairing', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [menu, setMenu] = useState('')
  const [recommendations, setRecommendations] = useState<PairingRecommendation[]>([])

  const { data: wines, isLoading: winesLoading } = useWines()
  const pairingMutation = useFoodPairing()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  const handleGetPairing = async () => {
    if (!wines || wines.length === 0) return

    // Filter to only wines in drinking window or without drinking window set
    const currentYear = new Date().getFullYear()
    const availableWines = wines.filter(
      (wine) =>
        (wine.quantity ?? 0) > 0 &&
        (!wine.drink_window_start ||
          !wine.drink_window_end ||
          (currentYear >= wine.drink_window_start && currentYear <= wine.drink_window_end))
    )

    const result = await pairingMutation.mutateAsync({
      menu,
      wines: availableWines.length > 0 ? availableWines : wines,
    })

    setRecommendations(result.recommendations)
  }

  if (authLoading) {
    return null
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
              onClick={handleGetPairing}
              loading={pairingMutation.isPending}
            >
              {pairingMutation.isPending ? t('pairing:buttons.analyzing') : t('pairing:buttons.getPairing')}
            </Button>

            {wines && (
              <Text size="sm" c="dimmed">
                {t('pairing:wineCount', { count: wines.length })}
              </Text>
            )}
          </Stack>
        </Paper>

        {recommendations.length > 0 && (
          <Stack gap="md">
            <Group>
              <IconChefHat size={24} stroke={1.5} />
              <Text size="lg" fw={700}>
                {t('pairing:results.title')}
              </Text>
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

            <Button variant="subtle" onClick={() => setRecommendations([])}>
              {t('pairing:buttons.clearResults')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
