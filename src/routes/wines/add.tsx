import { createFileRoute, Navigate, useRouter, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Stack } from '@mantine/core'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { WineForm, type WineFormValues } from '../../components/WineForm'
import { useAddWine, useUploadWinePhoto } from '../../hooks/useWines'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import type { BreadcrumbItem } from '../../components/Breadcrumb'

export const Route = createFileRoute('/wines/add')({
  component: AddWine,
})

function AddWine() {
  const { t } = useTranslation(['wines', 'common'])
  const router = useRouter()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const addWine = useAddWine()
  const uploadPhoto = useUploadWinePhoto()

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

      // First create the wine
      const wine = await addWine.mutateAsync({
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
        photo_url: photoUrl,
        user_id: '',
      })

      // If there's a photo, upload it and update the wine
      if (photo && wine.id) {
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
      if (wine.id) {
        navigate({ to: '/wines/$id', params: { id: wine.id } })
      } else {
        router.history.back()
      }
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
