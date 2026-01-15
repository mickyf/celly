import { createFileRoute } from '@tanstack/react-router'
import {
  Text,
  Container,
  Stack,
  Select,
  Group,
  Loader,
  Center,
  Paper,
  Alert,
  Modal,
  Button,
  TextInput,
  ActionIcon
} from '@mantine/core'
import { IconInfoCircle, IconPlus } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import { useCellars, useAddCellar } from '../../hooks/useCellars'
import { useWineLocations } from '../../hooks/useWineLocations'
import { CellarVisualizer } from '../../components/CellarVisualizer'
import { PageHeader } from '../../components/PageHeader'

export const Route = createFileRoute('/cellars/')({
  component: CellarOverview,
})

function CellarOverview() {
  const { t } = useTranslation(['wines', 'common'])
  const { data: cellars, isLoading: cellarsLoading } = useCellars()
  const [selectedCellarId, setSelectedCellarId] = useState<string | null>(null)
  const { data: locations } = useWineLocations(undefined, selectedCellarId || undefined)
  const addCellar = useAddCellar()

  // Quick-add cellar state
  const [cellarModalOpened, setCellarModalOpened] = useState(false)
  const [newCellarName, setNewCellarName] = useState('')

  const handleAddCellar = async () => {
    if (!newCellarName.trim()) return
    try {
      const result = await addCellar.mutateAsync({ name: newCellarName })
      setSelectedCellarId(result.id)
      setNewCellarName('')
      setCellarModalOpened(false)
    } catch (error) {
      console.error('Failed to add cellar:', error)
    }
  }

  const cellarOptions = useMemo(
    () =>
      cellars?.map((c) => ({
        value: c.id,
        label: c.name,
      })) || [],
    [cellars]
  )

  // Default to first cellar
  useMemo(() => {
    if (cellars && cellars.length > 0 && !selectedCellarId) {
      setSelectedCellarId(cellars[0].id)
    }
  }, [cellars, selectedCellarId])

  const totalBottles = useMemo(
    () => locations?.reduce((acc, curr) => acc + curr.quantity, 0) || 0,
    [locations]
  )

  if (cellarsLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    )
  }

  if (!cellars || cellars.length === 0) {
    return (
      <Container size="xl">
        <Stack gap="lg">
          <Modal
            opened={cellarModalOpened}
            onClose={() => setCellarModalOpened(false)}
            title={t('wines:form.buttons.addCellar')}
          >
            <Stack>
              <TextInput
                label={t('wines:form.labels.cellarName')}
                placeholder={t('wines:form.placeholders.cellarName')}
                value={newCellarName}
                onChange={(e) => setNewCellarName(e.currentTarget.value)}
                required
              />
              <Button onClick={handleAddCellar} loading={addCellar.isPending}>
                {t('common:buttons.save')}
              </Button>
            </Stack>
          </Modal>

          <PageHeader
            title={t('wines:overview.title')}
            breadcrumbs={[{ label: t('common:breadcrumbs.home'), to: '/' }, { label: t('wines:overview.title') }]}
          />
          <Paper shadow="sm" p="xl" withBorder>
            <Stack align="center" gap="md">
              <Alert icon={<IconInfoCircle size={16} />} title={t('wines:overview.emptyTitle')} color="blue" variant="light" w="100%">
                {t('wines:overview.emptyMessage')}
              </Alert>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => setCellarModalOpened(true)}
                size="md"
              >
                {t('wines:form.buttons.addCellar')}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Modal
          opened={cellarModalOpened}
          onClose={() => setCellarModalOpened(false)}
          title={t('wines:form.buttons.addCellar')}
        >
          <Stack>
            <TextInput
              label={t('wines:form.labels.cellarName')}
              placeholder={t('wines:form.placeholders.cellarName')}
              value={newCellarName}
              onChange={(e) => setNewCellarName(e.currentTarget.value)}
              required
            />
            <Button onClick={handleAddCellar} loading={addCellar.isPending}>
              {t('common:buttons.save')}
            </Button>
          </Stack>
        </Modal>

        <PageHeader
          title={t('wines:overview.title')}
          breadcrumbs={[{ label: t('common:breadcrumbs.home'), to: '/' }, { label: t('wines:overview.title') }]}
        />

        <Paper shadow="sm" p="md" withBorder>
          <Group justify="space-between" align="flex-end">
            <Group align="flex-end">
              <Select
                label={t('wines:form.labels.cellar')}
                placeholder={t('wines:form.placeholders.cellar')}
                data={cellarOptions}
                value={selectedCellarId}
                onChange={setSelectedCellarId}
                style={{ width: 300 }}
              />
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => setCellarModalOpened(true)}
                title={t('wines:form.buttons.addCellar')}
                mb={4}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
            <Stack gap={0} align="flex-end">
              <Text fw={700} size="xl">{totalBottles}</Text>
              <Text size="xs" c="dimmed">{t('common:plurals.bottle_other')}</Text>
            </Stack>
          </Group>
        </Paper>

        {selectedCellarId && locations && (
          <CellarVisualizer
            cellarId={selectedCellarId}
            locations={locations}
          />
        )}
      </Stack>
    </Container>
  )
}
