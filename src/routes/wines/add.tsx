import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { AuthSplash } from '../../components/AuthSplash'
import type { User } from '@supabase/supabase-js'
import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Paper,
  Group,
  Button,
  TextInput,
  LoadingOverlay,
} from '@mantine/core'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import {
  IconUpload,
  IconPhoto,
  IconX,
  IconCamera,
  IconSparkles,
  IconPencil,
  IconArrowLeft,
} from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { WineForm, type WineFormValues } from '../../components/WineForm'
import { CameraCapture } from '../../components/CameraCapture'
import { useAddWine, useUploadWinePhoto } from '../../hooks/useWines'
import { useEnrichWineFromImage, useIdentifyWineByName } from '../../hooks/useWineEnrichment'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import type { BreadcrumbItem } from '../../components/Breadcrumb'
import { RouteError } from '../../components/RouteError'
import type { WineEnrichmentData } from '../../lib/claude'

export const Route = createFileRoute('/wines/add')({
  component: AddWine,
  errorComponent: RouteError,
})

function enrichmentDataToFormValues(data: WineEnrichmentData): Partial<WineFormValues> {
  return {
    name: data.name,
    grapes: data.grapes,
    vintage: data.vintage,
    winery_id: data.winery?.matchedExistingId,
    drink_window_start: data.drinkingWindow?.start,
    drink_window_end: data.drinkingWindow?.end,
    price: data.price,
    food_pairings: data.foodPairings,
  }
}

function AddWine() {
  const { t } = useTranslation(['wines', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const addWine = useAddWine()
  const uploadPhoto = useUploadWinePhoto()
  const enrichFromImage = useEnrichWineFromImage()
  const identifyByName = useIdentifyWineByName()

  const [step, setStep] = useState<'choose' | 'form'>('choose')
  const [prefill, setPrefill] = useState<Partial<WineFormValues>>({})
  const [prefillPhoto, setPrefillPhoto] = useState<File | null>(null)
  const [nameQuery, setNameQuery] = useState('')
  const [cameraOpened, setCameraOpened] = useState(false)

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    return [
      { label: t('common:breadcrumbs.home'), to: '/' },
      { label: t('common:breadcrumbs.myWines'), to: '/wines' },
      { label: t('common:breadcrumbs.addWine'), to: undefined },
    ]
  }, [t])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [])

  const handlePhotoSelected = async (file: File) => {
    setPrefillPhoto(file)
    try {
      const data = await enrichFromImage.mutateAsync({ file })
      setPrefill(enrichmentDataToFormValues(data))
    } catch {
      // toast surfaced by hook; fall through with empty prefill + photo
    } finally {
      setStep('form')
    }
  }

  const handlePhotoDrop = (files: File[]) => {
    const file = files[0]
    if (file) handlePhotoSelected(file)
  }

  const handleNameSearch = async () => {
    const trimmed = nameQuery.trim()
    if (!trimmed) return
    try {
      const data = await identifyByName.mutateAsync({ name: trimmed })
      setPrefill({ ...enrichmentDataToFormValues(data), name: data.name || trimmed })
    } catch {
      setPrefill({ name: trimmed })
    } finally {
      setStep('form')
    }
  }

  const handleManual = () => {
    setPrefill({})
    setPrefillPhoto(null)
    setStep('form')
  }

  const handleBackToChooser = () => {
    setStep('choose')
    setPrefill({})
    setPrefillPhoto(null)
  }

  const handleSubmit = async (values: WineFormValues, photo?: File) => {
    let wine
    try {
      wine = await addWine.mutateAsync({
        ...values,
        photo_url: null,
        user_id: '',
      })
    } catch {
      return
    }

    if (!wine?.id) return

    if (photo) {
      try {
        const photoUrl = await uploadPhoto.mutateAsync({ file: photo, wineId: wine.id })
        await supabase.from('wines').update({ photo_url: photoUrl }).eq('id', wine.id)
      } catch {
        // photo errors surfaced via the upload hook
      }
    }

    if (values.quantity > 0) {
      navigate({ to: '/wines/$id/place', params: { id: wine.id } })
    } else {
      navigate({ to: '/wines/$id', params: { id: wine.id } })
    }
  }

  if (loading) {
    return <AuthSplash />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (step === 'form') {
    return (
      <Container size="md">
        <Stack gap="xl">
          <PageHeader
            breadcrumbs={breadcrumbs}
            onBack={handleBackToChooser}
            title={
              <div>
                <Title order={1}>{t('wines:add.title')}</Title>
                <Text c="dimmed" size="lg">{t('wines:add.subtitle')}</Text>
              </div>
            }
          />

          <WineForm
            prefill={prefill}
            initialPhoto={prefillPhoto}
            onSubmit={handleSubmit}
            onCancel={handleBackToChooser}
            isLoading={addWine.isPending || uploadPhoto.isPending}
          />
        </Stack>
      </Container>
    )
  }

  const aiBusy = enrichFromImage.isPending || identifyByName.isPending

  return (
    <Container size="lg">
      <Stack gap="xl">
        <PageHeader
          breadcrumbs={breadcrumbs}
          title={
            <div>
              <Title order={1}>{t('wines:addChooser.title')}</Title>
              <Text c="dimmed" size="lg">{t('wines:addChooser.subtitle')}</Text>
            </div>
          }
        />

        <div style={{ position: 'relative' }}>
          <LoadingOverlay
            visible={aiBusy}
            overlayProps={{ radius: 'md', blur: 2 }}
            loaderProps={{
              children: (
                <Stack align="center" gap="xs">
                  <IconSparkles size={32} color="var(--mantine-color-grape-6)" />
                  <Text fw={600}>{t('wines:addChooser.identifying')}</Text>
                </Stack>
              ),
            }}
          />

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <Paper shadow="sm" p="lg" radius="md" withBorder>
              <Stack gap="md" h="100%">
                <Group gap="xs">
                  <IconPhoto size={20} />
                  <Text fw={700} size="lg">{t('wines:addChooser.photo.title')}</Text>
                </Group>
                <Text size="sm" c="dimmed">{t('wines:addChooser.photo.description')}</Text>

                <Dropzone
                  onDrop={handlePhotoDrop}
                  accept={IMAGE_MIME_TYPE}
                  maxSize={5 * 1024 ** 2}
                  multiple={false}
                  disabled={aiBusy}
                >
                  <Group justify="center" gap="md" mih={140} style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept><IconUpload size={40} stroke={1.5} /></Dropzone.Accept>
                    <Dropzone.Reject><IconX size={40} stroke={1.5} /></Dropzone.Reject>
                    <Dropzone.Idle><IconPhoto size={40} stroke={1.5} /></Dropzone.Idle>
                    <div>
                      <Text size="md" inline>{t('common:camera.photoDrop')}</Text>
                      <Text size="xs" c="dimmed" inline mt={5}>{t('common:camera.photoSize')}</Text>
                    </div>
                  </Group>
                </Dropzone>

                <Button
                  variant="light"
                  leftSection={<IconCamera size={18} />}
                  onClick={() => setCameraOpened(true)}
                  fullWidth
                  disabled={aiBusy}
                >
                  {t('common:camera.takePhoto')}
                </Button>
              </Stack>
            </Paper>

            <Paper shadow="sm" p="lg" radius="md" withBorder>
              <Stack gap="md" h="100%">
                <Group gap="xs">
                  <IconSparkles size={20} />
                  <Text fw={700} size="lg">{t('wines:addChooser.text.title')}</Text>
                </Group>
                <Text size="sm" c="dimmed">{t('wines:addChooser.text.description')}</Text>

                <TextInput
                  placeholder={t('wines:addChooser.text.placeholder')}
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nameQuery.trim()) handleNameSearch()
                  }}
                  disabled={aiBusy}
                />

                <Button
                  variant="gradient"
                  gradient={{ from: 'grape', to: 'violet', deg: 90 }}
                  leftSection={<IconSparkles size={18} />}
                  onClick={handleNameSearch}
                  disabled={!nameQuery.trim() || aiBusy}
                  fullWidth
                >
                  {t('wines:addChooser.text.button')}
                </Button>

                <div style={{ flex: 1 }} />
              </Stack>
            </Paper>

            <Paper shadow="sm" p="lg" radius="md" withBorder>
              <Stack gap="md" h="100%">
                <Group gap="xs">
                  <IconPencil size={20} />
                  <Text fw={700} size="lg">{t('wines:addChooser.manual.title')}</Text>
                </Group>
                <Text size="sm" c="dimmed">{t('wines:addChooser.manual.description')}</Text>

                <div style={{ flex: 1 }} />

                <Button
                  variant="light"
                  leftSection={<IconPencil size={18} />}
                  onClick={handleManual}
                  fullWidth
                  disabled={aiBusy}
                >
                  {t('wines:addChooser.manual.button')}
                </Button>
              </Stack>
            </Paper>
          </SimpleGrid>
        </div>

        <Group justify="flex-start">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate({ to: '/wines' })}
          >
            {t('common:buttons.back')}
          </Button>
        </Group>

        <CameraCapture
          opened={cameraOpened}
          onClose={() => setCameraOpened(false)}
          onCapture={(file) => {
            setCameraOpened(false)
            handlePhotoSelected(file)
          }}
        />
      </Stack>
    </Container>
  )
}
