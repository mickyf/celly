import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Stack } from '@mantine/core'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { WineForm, type WineFormValues } from '../../components/WineForm'
import { useAddWine, useUploadWinePhoto } from '../../hooks/useWines'
import { useAddWineLocation } from '../../hooks/useWineLocations'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import type { BreadcrumbItem } from '../../components/Breadcrumb'

export const Route = createFileRoute('/wines/add')({
  component: AddWine,
})

function AddWine() {
  const { t } = useTranslation(['wines', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const addWine = useAddWine()
  const uploadPhoto = useUploadWinePhoto()
  const addLocation = useAddWineLocation()

  // Generate breadcrumbs
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    return [
      { label: t('common:breadcrumbs.home'), to: '/' },
      { label: t('common:breadcrumbs.myWines'), to: '/wines' },
      { label: t('common:breadcrumbs.addWine'), to: undefined }, // Current page
    ]
  }, [t])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (values: WineFormValues, photo?: File) => {
    try {
      let photoUrl: string | null = null

      // Extract locations from values
      const { locations, ...wineValues } = values

      // First create the wine
      const wine = await addWine.mutateAsync({
        ...wineValues,
        photo_url: photoUrl,
        user_id: '',
      })

      if (!wine.id) throw new Error('Failed to create wine')

      // Save locations
      await Promise.all(
        locations.map((loc) =>
          addLocation.mutateAsync({
            ...loc,
            wine_id: wine.id,
            user_id: '', // Hook will replace this with real user ID
          })
        )
      )

      // If there's a photo, upload it and update the wine
      if (photo) {
        photoUrl = await uploadPhoto.mutateAsync({
          file: photo,
          wineId: wine.id,
        })

        // Update the wine record with the photo URL
        await supabase
          .from('wines')
          .update({ photo_url: photoUrl })
          .eq('id', wine.id)
      }

      // Navigate to the newly created wine detail page
      navigate({ to: '/wines/$id', params: { id: wine.id } })
    } catch (error) {
      console.error('Error adding wine:', error)
    }
  }

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <Container size="md">
      <Stack gap="xl">
        <PageHeader
          breadcrumbs={breadcrumbs}
          title={
            <div>
              <Title order={1}>{t('wines:add.title')}</Title>
              <Text c="dimmed" size="lg">
                {t('wines:add.subtitle')}
              </Text>
            </div>
          }
        />

        <WineForm
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/wines' })}
          isLoading={addWine.isPending || uploadPhoto.isPending}
        />
      </Stack>
    </Container>
  )
}
