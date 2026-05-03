import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import type { User } from '@supabase/supabase-js'
import { Container, Title, Text, Stack, Loader, Center } from '@mantine/core'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { WineForm, type WineFormValues } from '../../../components/WineForm'
import { useWine, useUpdateWine, useUploadWinePhoto, useDeleteWinePhoto } from '../../../hooks/useWines'
import { useWineLocations, useAddWineLocation, useUpdateWineLocation, useDeleteWineLocation } from '../../../hooks/useWineLocations'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../../components/PageHeader'
import type { BreadcrumbItem } from '../../../components/Breadcrumb'
import { RouteError } from '../../../components/RouteError'

interface WineEditSearch {
  from?: string
  wineryId?: string
  wineryName?: string
}

export const Route = createFileRoute('/wines/$id/edit')({
  component: EditWine,
  errorComponent: RouteError,
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
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wine, isLoading } = useWine(id)
  const updateWine = useUpdateWine()
  const uploadPhoto = useUploadWinePhoto()
  const deletePhoto = useDeleteWinePhoto()

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

  const { data: existingLocations } = useWineLocations(id)
  const addLocation = useAddWineLocation()
  const updateLocation = useUpdateWineLocation()
  const deleteLocation = useDeleteWineLocation()

  const handleSubmit = async (values: WineFormValues, photo?: File, photoCleared?: boolean) => {
    try {
      // Extract locations from values
      const { locations, ...wineValues } = values

      // If photo was cleared (and no replacement), remove storage object and null the column
      const removingPhoto = photoCleared && !photo && wine?.photo_url

      // Update the wine
      await updateWine.mutateAsync({
        id,
        ...wineValues,
        ...(removingPhoto ? { photo_url: null } : {}),
      })

      if (removingPhoto && wine?.photo_url) {
        await deletePhoto.mutateAsync({ photoUrl: wine.photo_url })
      }

      // Sync locations using existingLocations from useWineLocations hook
      if (existingLocations) {
        const validLocations = locations.filter((l) => l.cellar_id)
        const locationsToDelete = existingLocations.filter(
          (existing) => !validLocations.find((l) => l.id === existing.id)
        )
        const locationsToUpdate = validLocations.filter((l) => l.id)
        const locationsToAdd = validLocations.filter((l) => !l.id)

        await Promise.all([
          ...locationsToDelete.map((l) =>
            deleteLocation.mutateAsync({ id: l.id, wineId: id })
          ),
          ...locationsToUpdate.map((l) =>
            updateLocation.mutateAsync({
              id: l.id!,
              cellar_id: l.cellar_id,
              shelf: l.shelf,
              row: l.row,
              column: l.column,
              quantity: l.quantity,
              wine_id: id,
            })
          ),
          ...locationsToAdd.map((l) =>
            addLocation.mutateAsync({
              ...l,
              wine_id: id,
              user_id: '', // Hook will handle this
            })
          ),
        ])
      }

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

      navigate({ to: '/wines/$id', params: { id } })
    } catch {
      // handled in mutation onError
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
