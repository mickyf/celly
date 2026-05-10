import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Paper,
  LoadingOverlay,
} from '@mantine/core'
import { Dropzone, MIME_TYPES, PDF_MIME_TYPE } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import {
  IconUpload,
  IconX,
  IconFileImport,
  IconCamera,
  IconSparkles,
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import Fuse from 'fuse.js'
import { AuthSplash } from '../../components/AuthSplash'
import { CameraCapture } from '../../components/CameraCapture'
import { PageHeader } from '../../components/PageHeader'
import { RouteError } from '../../components/RouteError'
import { OrderImportTable } from '../../components/OrderImportTable'
import type { BreadcrumbItem } from '../../components/Breadcrumb'
import { supabase } from '../../lib/supabase'
import { useWines } from '../../hooks/useWines'
import { useWineries } from '../../hooks/useWineries'
import {
  useParseOrderDocument,
  useBulkImportWines,
  type ImportRow,
} from '../../hooks/useOrderImport'
import type { ParsedWine } from '../../lib/claude'

export const Route = createFileRoute('/wines/import')({
  component: ImportWines,
  errorComponent: RouteError,
})

const ACCEPTED_MIME_TYPES: string[] = [
  MIME_TYPES.png,
  MIME_TYPES.jpeg,
  MIME_TYPES.gif,
  MIME_TYPES.webp,
  ...PDF_MIME_TYPE,
]
const MAX_FILE_BYTES = 5 * 1024 ** 2

type Step = 'upload' | 'review'

function normaliseName(s: string): string {
  return s.trim().toLowerCase()
}

function ImportWines() {
  const { t } = useTranslation(['wines', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const { data: wines = [] } = useWines()
  const { data: wineries = [] } = useWineries()
  const parseMutation = useParseOrderDocument()
  const importMutation = useBulkImportWines()

  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [cameraOpened, { open: openCamera, close: closeCamera }] = useDisclosure(false)

  const breadcrumbs = useMemo(
    (): BreadcrumbItem[] => [
      { label: t('common:breadcrumbs.home'), to: '/' },
      { label: t('common:breadcrumbs.myWines'), to: '/wines' },
      { label: t('common:breadcrumbs.import'), to: undefined },
    ],
    [t],
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  const matchExistingWine = (name: string, vintage: number | null): string | null => {
    const target = normaliseName(name)
    const found = wines.find(
      (w) => normaliseName(w.name) === target && (w.vintage ?? null) === vintage,
    )
    return found?.id ?? null
  }

  const buildRows = (parsed: ParsedWine[]): ImportRow[] => {
    const fuse = new Fuse(wineries, { keys: ['name'], threshold: 0.3, includeScore: true })
    return parsed.map((p) => {
      const existingWineId = matchExistingWine(p.name, p.vintage)
      let winery: ImportRow['winery'] = null
      if (p.winery) {
        const matches = fuse.search(p.winery.name)
        if (matches.length > 0) {
          winery = {
            existingId: matches[0].item.id,
            newName: null,
            newCountryCode: null,
          }
        } else {
          winery = {
            existingId: null,
            newName: p.winery.name,
            newCountryCode: p.winery.countryCode,
          }
        }
      }
      return {
        rowId: crypto.randomUUID(),
        included: true,
        existingWineId,
        name: p.name,
        vintage: p.vintage,
        quantity: p.quantity ?? 1,
        price: p.price,
        bottleSize: p.bottleSize,
        winery,
      }
    })
  }

  const handleDrop = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      const result = await parseMutation.mutateAsync({ file })
      if (result.wines.length === 0) {
        notifications.show({
          title: t('wines:import.empty.title'),
          message: t('wines:import.empty.message'),
          color: 'yellow',
        })
        return
      }
      setRows(buildRows(result.wines))
      setStep('review')
    } catch {
      // showMutationError already handled by the hook
    }
  }

  const handleReject = () => {
    notifications.show({
      title: t('wines:import.errors.parseTitle'),
      message: t('wines:import.upload.rejected'),
      color: 'red',
    })
  }

  const handleRowChange = (rowId: string, patch: Partial<ImportRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }

  const handleRowRemove = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  const handleCancelReview = () => {
    setStep('upload')
    setRows([])
  }

  const summary = useMemo(() => {
    const counts = { createNew: 0, addStock: 0, skip: 0 }
    for (const r of rows) {
      if (!r.included) counts.skip++
      else if (r.existingWineId) counts.addStock++
      else counts.createNew++
    }
    return counts
  }, [rows])

  // A new-wine row needs a non-empty name; restock rows don't (they reference an existing wine).
  const hasInvalid = rows.some(
    (r) => r.included && r.existingWineId === null && !r.name.trim(),
  )

  const handleSave = async () => {
    if (hasInvalid) return
    try {
      const result = await importMutation.mutateAsync({ rows, existingWineries: wineries })
      notifications.show({
        title: t('wines:import.saved.title'),
        message: t('wines:import.saved.message', {
          created: result.created,
          restocked: result.restocked,
        }),
        color: 'green',
      })
      navigate({ to: '/wines', search: { importBatchId: result.batchId } })
    } catch {
      // surfaced by hook
    }
  }

  if (authLoading) return <AuthSplash />
  if (!user) return <Navigate to="/login" />

  if (step === 'review') {
    return (
      <Container size="xl">
        <Stack gap="xl">
          <PageHeader
            breadcrumbs={breadcrumbs}
            onBack={handleCancelReview}
            title={
              <div>
                <Title order={1}>{t('wines:import.review.title')}</Title>
                <Text c="dimmed" size="lg">
                  {t('wines:import.review.summary', {
                    new: summary.createNew,
                    restock: summary.addStock,
                    skip: summary.skip,
                  })}
                </Text>
              </div>
            }
          />

          <Paper shadow="sm" p="md" radius="md" withBorder pos="relative">
            <LoadingOverlay visible={importMutation.isPending} overlayProps={{ blur: 2 }} />
            <OrderImportTable
              rows={rows}
              onRowChange={handleRowChange}
              onRowRemove={handleRowRemove}
              wines={wines}
              wineries={wineries}
            />
          </Paper>

          <Group justify="flex-end">
            <Button variant="default" onClick={handleCancelReview} disabled={importMutation.isPending}>
              {t('common:buttons.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              loading={importMutation.isPending}
              disabled={rows.length === 0 || hasInvalid}
            >
              {t('wines:import.save', {
                count: summary.createNew + summary.addStock,
              })}
            </Button>
          </Group>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="md">
      <Stack gap="xl">
        <PageHeader
          breadcrumbs={breadcrumbs}
          title={
            <div>
              <Title order={1}>{t('wines:import.title')}</Title>
              <Text c="dimmed" size="lg">
                {t('wines:import.subtitle')}
              </Text>
            </div>
          }
        />

        <Paper shadow="sm" p="lg" radius="md" withBorder pos="relative">
          <LoadingOverlay
            visible={parseMutation.isPending}
            overlayProps={{ blur: 2 }}
            loaderProps={{
              children: (
                <Stack align="center" gap="xs">
                  <IconSparkles size={32} color="var(--mantine-color-grape-6)" />
                  <Text fw={600}>{t('wines:import.parsing')}</Text>
                </Stack>
              ),
            }}
          />

          <Stack gap="md">
            <Dropzone
              onDrop={handleDrop}
              onReject={handleReject}
              accept={ACCEPTED_MIME_TYPES}
              maxSize={MAX_FILE_BYTES}
              multiple={false}
              disabled={parseMutation.isPending}
            >
              <Group justify="center" gap="md" mih={160} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={40} stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={40} stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileImport size={40} stroke={1.5} />
                </Dropzone.Idle>
                <div>
                  <Text size="md" inline>
                    {t('wines:import.upload.dropPdfOrImage')}
                  </Text>
                  <Text size="xs" c="dimmed" inline mt={5}>
                    {t('wines:import.upload.sizeLimit')}
                  </Text>
                </div>
              </Group>
            </Dropzone>

            <Button
              variant="light"
              leftSection={<IconCamera size={18} />}
              onClick={openCamera}
              disabled={parseMutation.isPending}
              fullWidth
            >
              {t('wines:import.upload.takePhoto')}
            </Button>
          </Stack>
        </Paper>
      </Stack>

      <CameraCapture
        opened={cameraOpened}
        onClose={closeCamera}
        onCapture={(file) => {
          closeCamera()
          handleDrop([file])
        }}
      />
    </Container>
  )
}
