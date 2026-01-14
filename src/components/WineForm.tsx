import { useForm } from '@mantine/form'
import {
  TextInput,
  NumberInput,
  Button,
  Stack,
  Group,
  Paper,
  Text,
  Image,
  TagsInput,
  Select,
  Textarea,
} from '@mantine/core'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { IconUpload, IconPhoto, IconX, IconCamera } from '@tabler/icons-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWineries } from '../hooks/useWineries'
import { useEnrichWineFromImage } from '../hooks/useWineEnrichment'
import { CameraCapture } from './CameraCapture'
import type { Database } from '../types/database'
import { IconSparkles } from '@tabler/icons-react'

type Wine = Database['public']['Tables']['wines']['Row']

interface WineFormProps {
  wine?: Wine
  onSubmit: (values: WineFormValues, photo?: File) => void
  onCancel?: () => void
  isLoading?: boolean
}

export interface WineFormValues {
  name: string
  winery_id: string | null
  grapes: string[]
  vintage: number | null
  quantity: number
  price: number | null
  bottle_size: string | null
  drink_window_start: number | null
  drink_window_end: number | null
  food_pairings: string | null
}

export function WineForm({ wine, onSubmit, onCancel, isLoading }: WineFormProps) {
  const { t } = useTranslation(['wines', 'common'])
  const { data: wineries } = useWineries()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    wine?.photo_url || null
  )
  const [cameraOpened, setCameraOpened] = useState(false)
  const enrichFromImage = useEnrichWineFromImage()

  const wineryOptions = useMemo(
    () =>
      wineries?.map((w) => ({
        value: w.id,
        label: w.name,
      })) || [],
    [wineries]
  )

  const form = useForm<WineFormValues>({
    initialValues: {
      name: wine?.name || '',
      winery_id: wine?.winery_id || null,
      grapes: wine?.grapes || [],
      vintage: wine?.vintage || null,
      quantity: wine?.quantity || 1,
      price: wine?.price ? Number(wine.price) : null,
      bottle_size: wine?.bottle_size || null,
      drink_window_start: wine?.drink_window_start || null,
      drink_window_end: wine?.drink_window_end || null,
      food_pairings: wine?.food_pairings || null,
    },
    transformValues: (values: WineFormValues) => ({
      ...values,
      price: (typeof values.price === 'string' && values.price === '') ? null : values.price,
      drink_window_start: (typeof values.drink_window_start === 'string' && values.drink_window_start === '') ? null : values.drink_window_start,
      drink_window_end: (typeof values.drink_window_end === 'string' && values.drink_window_end === '') ? null : values.drink_window_end,
    }),
    validate: {
      name: (value) => (value.trim().length > 0 ? null : t('wines:form.validation.nameRequired')),
      quantity: (value) => (value > 0 ? null : t('wines:form.validation.quantityMin')),
      vintage: (value) =>
        value === null || (value >= 1900 && value <= new Date().getFullYear() + 10)
          ? null
          : t('wines:form.validation.invalidVintage'),
      drink_window_start: (value, values) => {
        if (value === null) return null
        if (typeof value === 'string' && value === '') return null
        if (value < 1900) return t('wines:form.validation.invalidYear')
        if (values.drink_window_end && value > values.drink_window_end) {
          return t('wines:form.validation.startBeforeEnd')
        }
        return null
      },
      drink_window_end: (value, values) => {
        if (value === null) return null
        if (typeof value === 'string' && value === '') return null
        if (value < 1900) return t('wines:form.validation.invalidYear')
        if (values.drink_window_start && value < values.drink_window_start) {
          return t('wines:form.validation.endAfterStart')
        }
        return null
      },
    },
  })

  const handlePhotoDrop = (files: File[]) => {
    const file = files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = (file: File) => {
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleIdentifyFromPhoto = async () => {
    if (!photoFile) return

    try {
      const data = await enrichFromImage.mutateAsync({ file: photoFile })
      if (data) {
        form.setValues({
          name: data.name || form.values.name,
          winery_id: data.winery?.matchedExistingId || form.values.winery_id,
          grapes: data.grapes || form.values.grapes,
          vintage: data.vintage || form.values.vintage,
          price: data.price ? Number(data.price) : form.values.price,
          drink_window_start: data.drinkingWindow?.start || form.values.drink_window_start,
          drink_window_end: data.drinkingWindow?.end || form.values.drink_window_end,
          food_pairings: data.foodPairings || form.values.food_pairings,
        })
      }
    } catch (error) {
      console.error('Identification failed:', error)
    }
  }

  const handleSubmit = (values: WineFormValues) => {
    onSubmit(values, photoFile || undefined)
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Stack gap="lg" style={{ flex: 1, paddingBottom: '80px' }}>
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={700} size="lg">
              {t('wines:form.sections.basicInfo')}
            </Text>

            <TextInput
              label={t('wines:form.labels.wineName')}
              placeholder={t('wines:form.placeholders.wineName')}
              required
              {...form.getInputProps('name')}
            />

            <Select
              label={t('wines:form.labels.winery')}
              placeholder={t('wines:form.placeholders.winery')}
              description={t('wines:form.descriptions.winery')}
              data={wineryOptions}
              searchable
              clearable
              {...form.getInputProps('winery_id')}
            />

            <TagsInput
              label={t('wines:form.labels.grapeVarieties')}
              placeholder={t('wines:form.placeholders.grapeVarieties')}
              description={t('wines:form.descriptions.grapeVarieties')}
              {...form.getInputProps('grapes')}
            />

            <Group grow>
              <NumberInput
                label={t('wines:form.labels.vintage')}
                placeholder={t('wines:form.placeholders.vintage')}
                min={1900}
                max={new Date().getFullYear() + 10}
                {...form.getInputProps('vintage')}
              />

              <NumberInput
                label={t('wines:form.labels.quantity')}
                placeholder={t('wines:form.placeholders.quantity')}
                required
                min={0}
                {...form.getInputProps('quantity')}
              />
            </Group>

            <NumberInput
              label={t('wines:form.labels.pricePerBottle')}
              placeholder={t('wines:form.placeholders.price')}
              prefix="CHF "
              decimalScale={2}
              min={0}
              {...form.getInputProps('price')}
            />

            <Select
              label={t('wines:form.labels.bottleSize')}
              placeholder={t('wines:form.placeholders.bottleSize')}
              description={t('wines:form.descriptions.bottleSize')}
              data={[
                { value: '37.5cl', label: '37.5cl (Halbe Flasche)' },
                { value: '75cl', label: '75cl (Standard)' },
                { value: '150cl', label: '150cl (Magnum)' },
                { value: '300cl', label: '300cl (Double Magnum)' },
                { value: '500cl', label: '500cl (Jeroboam)' },
                { value: '600cl', label: '600cl (Imperial)' },
              ]}
              searchable
              clearable
              {...form.getInputProps('bottle_size')}
            />
          </Stack>
        </Paper>

        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={700} size="lg">
              {t('wines:form.sections.drinkingWindow')}
            </Text>

            <Text size="sm" c="dimmed">
              {t('wines:form.descriptions.drinkingWindow')}
            </Text>

            <Group grow>
              <NumberInput
                label={t('wines:form.labels.startYear')}
                placeholder={t('wines:form.placeholders.startYear')}
                min={1900}
                {...form.getInputProps('drink_window_start')}
              />

              <NumberInput
                label={t('wines:form.labels.endYear')}
                placeholder={t('wines:form.placeholders.endYear')}
                min={1900}
                {...form.getInputProps('drink_window_end')}
              />
            </Group>

            <Textarea
              label={t('wines:form.labels.foodPairings')}
              placeholder={t('wines:form.placeholders.foodPairings')}
              description={t('wines:form.descriptions.foodPairings')}
              autosize
              minRows={3}
              maxRows={6}
              {...form.getInputProps('food_pairings')}
            />
          </Stack>
        </Paper>

        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={700} size="lg">
              {t('wines:form.sections.photo')}
            </Text>

            {photoPreview ? (
              <div>
                <Image
                  src={photoPreview}
                  alt="Wine bottle"
                  height={200}
                  fit="contain"
                  radius="md"
                />
                <Group grow mt="sm">
                  <Button
                    variant="light"
                    color="grape"
                    leftSection={<IconSparkles size={18} />}
                    onClick={handleIdentifyFromPhoto}
                    loading={enrichFromImage.isPending}
                  >
                    {t('wines:enrichment.identifyFromPhoto')}
                  </Button>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => {
                      setPhotoFile(null)
                      setPhotoPreview(null)
                    }}
                  >
                    {t('wines:form.buttons.removePhoto')}
                  </Button>
                </Group>
              </div>
            ) : (
              <Stack gap="md">
                <Dropzone
                  onDrop={handlePhotoDrop}
                  accept={IMAGE_MIME_TYPE}
                  maxSize={5 * 1024 ** 2}
                  multiple={false}
                >
                  <Group
                    justify="center"
                    gap="xl"
                    mih={220}
                    style={{ pointerEvents: 'none' }}
                  >
                    <Dropzone.Accept>
                      <IconUpload size={52} stroke={1.5} />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                      <IconX size={52} stroke={1.5} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                      <IconPhoto size={52} stroke={1.5} />
                    </Dropzone.Idle>

                    <div>
                      <Text size="xl" inline>
                        {t('common:camera.photoDrop')}
                      </Text>
                      <Text size="sm" c="dimmed" inline mt={7}>
                        {t('common:camera.photoSize')}
                      </Text>
                    </div>
                  </Group>
                </Dropzone>

                <Button
                  variant="light"
                  leftSection={<IconCamera size={18} />}
                  onClick={() => setCameraOpened(true)}
                  fullWidth
                >
                  {t('common:camera.takePhoto')}
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>

        <CameraCapture
          opened={cameraOpened}
          onClose={() => setCameraOpened(false)}
          onCapture={handleCameraCapture}
        />
      </Stack>

      <Group
        justify="flex-end"
        wrap="nowrap"
        gap="xs"
        p="md"
        style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'var(--mantine-color-body)',
          borderTop: '1px solid var(--mantine-color-default-border)',
          zIndex: 100
        }}
      >
        {onCancel && (
          <Button variant="default" onClick={onCancel}>
            {t('common:buttons.cancel')}
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          {wine ? t('wines:form.buttons.updateWine') : t('wines:form.buttons.addWine')}
        </Button>
      </Group>
    </form>
  )
}
