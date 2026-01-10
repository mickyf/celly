import { createFileRoute, Navigate, useNavigate, useRouter } from '@tanstack/react-router'
import { Container, Title, Text, Stack, Loader, Center } from '@mantine/core'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { WineForm, type WineFormValues } from '../../../components/WineForm'
import { useWine, useUpdateWine, useUploadWinePhoto } from '../../../hooks/useWines'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../../components/PageHeader'
import type { BreadcrumbItem } from '../../../components/Breadcrumb'

interface WineEditSearch {
  from?: string
  wineryId?: string
  wineryName?: string
}

export const Route = createFileRoute('/wines/$id/edit')({
  component: EditWine,
  validateSearch: (search: Record<string, unknown>): WineEditSearch => {
    return {
      from: typeof search.from === 'string' ? search.from : undefined,
      wineryId: typeof search.wineryId === 'string' ? search.wineryId : undefined,
      wineryName: typeof search.wineryName === 'string' ? search.wineryName : undefined,
    }
  },
})

function EditWine() {
  const { t } = useTranslation(['wines', 'common'])
  const { id } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wine, isLoading } = useWine(id)
  const updateWine = useUpdateWine()
  const uploadPhoto = useUploadWinePhoto()

  // Generate breadcrumbs based on navigation context
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (!wine) return []

    // Cross-resource context: Coming from winery
    if (search.from === 'winery' && search.wineryId && search.wineryName) {
      return [
        { label: t('common:breadcrumbs.home'), to: '/' },
        { label: t('common:breadcrumbs.wineries'), to: '/wineries' },
        { label: search.wineryName, to: `/wineries/${search.wineryId}` },
        { label: wine.name, to: `/wines/${id}`, search },
        { label: t('common:breadcrumbs.edit'), to: undefined }, // Current page
      ]
    }

    // Default wine path
    return [
      { label: t('common:breadcrumbs.home'), to: '/' },
      { label: t('common:breadcrumbs.myWines'), to: '/wines' },
      { label: wine.name, to: `/wines/${id}` },
      { label: t('common:breadcrumbs.edit'), to: undefined }, // Current page
    ]
  }, [wine, search, t, id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  const handleSubmit = async (values: WineFormValues, photo?: File) => {
    try {
      // Update the wine
      await updateWine.mutateAsync({
        id,
        name: values.name,
        winery_id: values.winery_id,
        grapes: values.grapes,
        vintage: values.vintage,
        quantity: values.quantity,
        price: values.price,
        bottle_size: values.bottle_size,
        drink_window_start: values.drink_window_start,
        drink_window_end: values.drink_window_end,
        food_pairings: values.food_pairings,
      })

      // If there's a new photo, upload it
      if (photo) {
        const photoUrl = await uploadPhoto.mutateAsync({
          file: photo,
          wineId: id,
        })

        // Update wine with new photo URL
        await updateWine.mutateAsync({
          id,
          photo_url: photoUrl,
        })
      }

      router.history.back()
    } catch (error) {
      console.error('Error updating wine:', error)
    }
  }

  if (authLoading || isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!wine) {
    return (
      <Container size="md">
        <Text c="red">{t('wines:detail.notFound')}</Text>
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
              <Title order={1}>{t('wines:edit.title')}</Title>
              <Text c="dimmed" size="lg">
                {t('wines:edit.subtitle')}
              </Text>
            </div>
          }
        />

        <WineForm
          wine={wine}
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/wines/$id', params: { id }, search })}
          isLoading={updateWine.isPending || uploadPhoto.isPending}
        />
      </Stack>
    </Container>
  )
}
