import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Stack } from '@mantine/core'
import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { WineryForm, type WineryFormValues } from '../../components/WineryForm'
import { useAddWinery } from '../../hooks/useWineries'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import type { BreadcrumbItem } from '../../components/Breadcrumb'

export const Route = createFileRoute('/wineries/add')({
  component: AddWinery,
})

function AddWinery() {
  const { t } = useTranslation(['wineries', 'common'])
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const addWinery = useAddWinery()

  // Generate breadcrumbs
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    return [
      { label: t('common:breadcrumbs.home'), to: '/' },
      { label: t('common:breadcrumbs.wineries'), to: '/wineries' },
      { label: t('common:breadcrumbs.addWinery'), to: undefined }, // Current page
    ]
  }, [t])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (values: WineryFormValues) => {
    try {
      const winery = await addWinery.mutateAsync({
        name: values.name,
        country_code: values.country_code,
      })

      // Navigate to newly created winery detail
      if (winery.id) {
        navigate({ to: '/wineries/$id', params: { id: winery.id } })
      } else {
        navigate({ to: '/wineries' })
      }
    } catch (error) {
      console.error('Error adding winery:', error)
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
              <Title order={1}>{t('wineries:add.title')}</Title>
              <Text c="dimmed" size="lg">
                {t('wineries:add.subtitle')}
              </Text>
            </div>
          }
        />

        <WineryForm
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/wineries' })}
          isLoading={addWinery.isPending}
        />
      </Stack>
    </Container>
  )
}
