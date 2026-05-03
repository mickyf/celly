import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { AuthSplash } from '../../components/AuthSplash'
import type { User } from '@supabase/supabase-js'
import { Container, Title, Text, Stack } from '@mantine/core'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { WineForm, type WineFormValues } from '../../components/WineForm'
import { useAddWine, useUploadWinePhoto } from '../../hooks/useWines'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import type { BreadcrumbItem } from '../../components/Breadcrumb'
import { RouteError } from '../../components/RouteError'

export const Route = createFileRoute('/wines/add')({
  component: AddWine,
  errorComponent: RouteError,
})

function AddWine() {
  const { t } = useTranslation(['wines', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
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

    navigate({ to: '/wines/$id', params: { id: wine.id } })
  }

  if (loading) {
    return <AuthSplash />
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
