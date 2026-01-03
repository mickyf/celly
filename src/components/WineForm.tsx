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
} from '@mantine/core'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

interface WineFormProps {
  wine?: Wine
  onSubmit: (values: WineFormValues, photo?: File) => void
  isLoading?: boolean
}

export interface WineFormValues {
  name: string
  grapes: string[]
  vintage: number | null
  quantity: number
  price: number | null
  drink_window_start: number | null
  drink_window_end: number | null
}

export function WineForm({ wine, onSubmit, isLoading }: WineFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    wine?.photo_url || null
  )

  const form = useForm<WineFormValues>({
    initialValues: {
      name: wine?.name || '',
      grapes: wine?.grapes || [],
      vintage: wine?.vintage || null,
      quantity: wine?.quantity || 1,
      price: wine?.price ? Number(wine.price) : null,
      drink_window_start: wine?.drink_window_start || null,
      drink_window_end: wine?.drink_window_end || null,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      quantity: (value) => (value > 0 ? null : 'Quantity must be at least 1'),
      vintage: (value) =>
        value === null || (value >= 1900 && value <= new Date().getFullYear() + 10)
          ? null
          : 'Please enter a valid vintage year',
      drink_window_start: (value, values) => {
        if (value === null) return null
        if (value < 1900) return 'Invalid year'
        if (values.drink_window_end && value > values.drink_window_end) {
          return 'Start year must be before end year'
        }
        return null
      },
      drink_window_end: (value, values) => {
        if (value === null) return null
        if (value < 1900) return 'Invalid year'
        if (values.drink_window_start && value < values.drink_window_start) {
          return 'End year must be after start year'
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

  const handleSubmit = (values: WineFormValues) => {
    onSubmit(values, photoFile || undefined)
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="lg">
        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={700} size="lg">
              Basic Information
            </Text>

            <TextInput
              label="Wine Name"
              placeholder="e.g., Château Margaux"
              required
              {...form.getInputProps('name')}
            />

            <TagsInput
              label="Grape Varieties"
              placeholder="Type and press Enter"
              description="Add multiple grape varieties"
              {...form.getInputProps('grapes')}
            />

            <Group grow>
              <NumberInput
                label="Vintage"
                placeholder="e.g., 2015"
                min={1900}
                max={new Date().getFullYear() + 10}
                {...form.getInputProps('vintage')}
              />

              <NumberInput
                label="Quantity"
                placeholder="Number of bottles"
                required
                min={0}
                {...form.getInputProps('quantity')}
              />
            </Group>

            <NumberInput
              label="Price (per bottle)"
              placeholder="0.00"
              prefix="$"
              decimalScale={2}
              min={0}
              {...form.getInputProps('price')}
            />
          </Stack>
        </Paper>

        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={700} size="lg">
              Drinking Window
            </Text>

            <Text size="sm" c="dimmed">
              When is this wine expected to be at its best?
            </Text>

            <Group grow>
              <NumberInput
                label="Start Year"
                placeholder="e.g., 2025"
                min={1900}
                {...form.getInputProps('drink_window_start')}
              />

              <NumberInput
                label="End Year"
                placeholder="e.g., 2035"
                min={1900}
                {...form.getInputProps('drink_window_end')}
              />
            </Group>
          </Stack>
        </Paper>

        <Paper shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={700} size="lg">
              Photo
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
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  mt="sm"
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPreview(null)
                  }}
                >
                  Remove Photo
                </Button>
              </div>
            ) : (
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
                      Drag image here or click to select
                    </Text>
                    <Text size="sm" c="dimmed" inline mt={7}>
                      Photo should not exceed 5MB
                    </Text>
                  </div>
                </Group>
              </Dropzone>
            )}
          </Stack>
        </Paper>

        <Group justify="flex-end">
          <Button type="submit" size="lg" loading={isLoading}>
            {wine ? 'Update Wine' : 'Add Wine'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
