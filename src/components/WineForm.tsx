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
  ActionIcon,
  Modal,
} from '@mantine/core'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { IconUpload, IconPhoto, IconX, IconCamera, IconTrash, IconPlus, IconSparkles } from '@tabler/icons-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWineries, useAddWinery } from '../hooks/useWineries'
import { useEnrichWineFromImage } from '../hooks/useWineEnrichment'
import { CameraCapture } from './CameraCapture'
import type { Database } from '../types/database'
import { useCellars, useAddCellar } from '../hooks/useCellars'
import { useWineLocations } from '../hooks/useWineLocations'
import { getCountryOptions } from '../constants/countries'

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
  locations: {
    id?: string
    cellar_id: string
    shelf: number | null
    row: number | null
    column: number | null
    quantity: number
  }[]
}

export function WineForm({ wine, onSubmit, onCancel, isLoading }: WineFormProps) {
  const { t } = useTranslation(['wines', 'common'])
  const { data: wineries } = useWineries()
  const addWinery = useAddWinery()
  const { data: cellars } = useCellars()
  const addCellar = useAddCellar()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    wine?.photo_url || null
  )
  const [cameraOpened, setCameraOpened] = useState(false)
  const [cellarModalOpened, setCellarModalOpened] = useState(false)
  const [wineryModalOpened, setWineryModalOpened] = useState(false)
  const [newCellarName, setNewCellarName] = useState('')
  const [newWineryName, setNewWineryName] = useState('')
  const [newWineryCountry, setNewWineryCountry] = useState<string | null>(null)
  const enrichFromImage = useEnrichWineFromImage()

  const countryOptions = useMemo(() => getCountryOptions(t), [t])

  const cellarOptions = useMemo(
    () =>
      cellars?.map((c) => ({
        value: c.id,
        label: c.name,
      })) || [],
    [cellars]
  )

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
      locations: [],
    },
    transformValues: (values: WineFormValues) => ({
      ...values,
      price: (typeof values.price === 'string' && values.price === '') ? null : values.price,
      drink_window_start: (typeof values.drink_window_start === 'string' && values.drink_window_start === '') ? null : values.drink_window_start,
      drink_window_end: (typeof values.drink_window_end === 'string' && values.drink_window_end === '') ? null : values.drink_window_end,
      locations: values.locations.map(l => ({
        ...l,
        shelf: (typeof l.shelf === 'string' && l.shelf === '') ? null : l.shelf,
        row: (typeof l.row === 'string' && l.row === '') ? null : l.row,
        column: (typeof l.column === 'string' && l.column === '') ? null : l.column,
      }))
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

  const handleAddWinery = async () => {
    if (!newWineryName.trim()) return
    try {
      const result = await addWinery.mutateAsync({
        name: newWineryName,
        country_code: newWineryCountry
      })
      form.setFieldValue('winery_id', result.id)
      setNewWineryName('')
      setNewWineryCountry(null)
      setWineryModalOpened(false)
    } catch (error) {
      console.error('Failed to add winery:', error)
    }
  }

  const { data: existingLocations } = useWineLocations(wine?.id)

  useMemo(() => {
    if (existingLocations && existingLocations.length > 0) {
      form.setFieldValue('locations', existingLocations.map(l => ({
        id: l.id,
        cellar_id: l.cellar_id,
        shelf: l.shelf,
        row: l.row,
        column: l.column,
        quantity: l.quantity
      })))
    } else if (!wine && cellarOptions.length > 0 && form.values.locations.length === 0) {
      // Add one empty location for new wines
      form.insertListItem('locations', {
        cellar_id: cellarOptions[0].value,
        shelf: null,
        row: null,
        column: null,
        quantity: 1
      })
    }
  }, [existingLocations, cellarOptions.length])

  const handleAddCellar = async (index?: number) => {
    if (!newCellarName.trim()) return
    try {
      const result = await addCellar.mutateAsync({ name: newCellarName })
      if (typeof index === 'number') {
        form.setFieldValue(`locations.${index}.cellar_id`, result.id)
      } else {
        // Fallback for identification or other uses
      }
      setNewCellarName('')
      setCellarModalOpened(false)
    } catch (error) {
      console.error('Failed to add cellar:', error)
    }
  }

  const [activeLocationIndex, setActiveLocationIndex] = useState<number | null>(null)

  const openAddCellarModal = (index: number) => {
    setActiveLocationIndex(index)
    setCellarModalOpened(true)
  }

  return (
    <>
      <Modal
        opened={cellarModalOpened}
        onClose={() => setCellarModalOpened(false)}
        title={t('wines:form.buttons.addCellar', { defaultValue: 'Add Cellar' })}
      >
        <Stack>
          <TextInput
            label={t('wines:form.labels.cellarName', { defaultValue: 'Cellar Name' })}
            placeholder={t('wines:form.placeholders.cellarName', { defaultValue: 'e.g., Main Cellar' })}
            value={newCellarName}
            onChange={(e) => setNewCellarName(e.currentTarget.value)}
            required
          />
          <Button onClick={() => handleAddCellar(activeLocationIndex ?? undefined)} loading={addCellar.isPending}>
            {t('common:buttons.save', { defaultValue: 'Save' })}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={wineryModalOpened}
        onClose={() => setWineryModalOpened(false)}
        title={t('wineries:add.title', { defaultValue: 'Add Winery' })}
      >
        <Stack>
          <TextInput
            label={t('wineries:form.labels.wineryName', { defaultValue: 'Winery Name' })}
            placeholder={t('wineries:form.placeholders.wineryName', { defaultValue: 'e.g., Château Margaux' })}
            value={newWineryName}
            onChange={(e) => setNewWineryName(e.currentTarget.value)}
            required
          />
          <Select
            label={t('wineries:form.labels.country', { defaultValue: 'Country' })}
            placeholder={t('wineries:form.placeholders.country', { defaultValue: 'Select country' })}
            data={countryOptions}
            value={newWineryCountry}
            onChange={setNewWineryCountry}
            searchable
            clearable
          />
          <Button onClick={handleAddWinery} loading={addWinery.isPending}>
            {t('common:buttons.save', { defaultValue: 'Save' })}
          </Button>
        </Stack>
      </Modal>

      <form onSubmit={form.onSubmit(handleSubmit)} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <Stack gap="lg" style={{ flex: 1, paddingBottom: '80px' }}>
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

              <Group align="flex-end">
                <Select
                  label={t('wines:form.labels.winery')}
                  placeholder={t('wines:form.placeholders.winery')}
                  description={t('wines:form.descriptions.winery')}
                  data={wineryOptions}
                  searchable
                  clearable
                  {...form.getInputProps('winery_id')}
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  onClick={() => setWineryModalOpened(true)}
                  title={t('wineries:add.title', { defaultValue: 'Add Winery' })}
                  mb={4}
                >
                  <IconPlus size={20} />
                </ActionIcon>
              </Group>

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
              <Stack gap="md">
                {form.values.locations.map((_, index) => (
                  <Paper key={index} withBorder p="sm" radius="md" bg="gray.0">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">
                          {t('wines:form.labels.location')} {index + 1}
                        </Text>
                        {form.values.locations.length > 1 && (
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => form.removeListItem('locations', index)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>

                      <Group align="flex-end">
                        <Select
                          label={t('wines:form.labels.cellar')}
                          placeholder={t('wines:form.placeholders.cellar')}
                          data={cellarOptions}
                          searchable
                          clearable
                          {...form.getInputProps(`locations.${index}.cellar_id`)}
                          style={{ flex: 1 }}
                        />
                        <ActionIcon
                          variant="subtle"
                          size="lg"
                          onClick={() => openAddCellarModal(index)}
                          title={t('wines:form.buttons.addCellar')}
                          mb={4}
                        >
                          <IconPlus size={20} />
                        </ActionIcon>
                      </Group>

                      <Group grow align="flex-end">
                        <NumberInput
                          label={t('wines:form.labels.shelf')}
                          placeholder={t('wines:form.placeholders.shelf')}
                          min={0}
                          {...form.getInputProps(`locations.${index}.shelf`)}
                        />
                        <NumberInput
                          label={t('wines:form.labels.row')}
                          placeholder={t('wines:form.placeholders.row')}
                          min={0}
                          {...form.getInputProps(`locations.${index}.row`)}
                        />
                        <NumberInput
                          label={t('wines:form.labels.column')}
                          placeholder={t('wines:form.placeholders.column')}
                          min={0}
                          {...form.getInputProps(`locations.${index}.column`)}
                        />
                        <NumberInput
                          label={t('wines:form.labels.quantity')}
                          placeholder={t('wines:form.placeholders.quantity')}
                          min={1}
                          required
                          {...form.getInputProps(`locations.${index}.quantity`)}
                          w={80}
                        />
                      </Group>
                    </Stack>
                  </Paper>
                ))}

                <Button
                  variant="subtle"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => form.insertListItem('locations', {
                    cellar_id: cellarOptions[0]?.value || '',
                    shelf: null,
                    row: null,
                    column: null,
                    quantity: 1
                  })}
                  fullWidth
                >
                  {t('wines:form.buttons.addLocation', { defaultValue: 'Add Another Location' })}
                </Button>
              </Stack>
            </Stack>
          </Paper>
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
    </>
  )
}
