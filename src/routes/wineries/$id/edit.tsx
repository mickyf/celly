import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Stack, Loader, Center } from '@mantine/core'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { WineryForm, type WineryFormValues } from '../../../components/WineryForm'
import { useWinery, useUpdateWinery } from '../../../hooks/useWineries'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/wineries/$id/edit')({
  component: EditWinery,
})

function EditWinery() {
  const { t } = useTranslation(['wineries'])
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: winery, isLoading } = useWinery(id)
  const updateWinery = useUpdateWinery()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
  }, [])

  const handleSubmit = async (values: WineryFormValues) => {
    try {
      await updateWinery.mutateAsync({
        id,
        name: values.name,
        country_code: values.country_code,
      })

      // Navigate back to wineries list
      navigate({ to: '/wineries' })
    } catch (error) {
      console.error('Error updating winery:', error)
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

  if (!winery) {
    return (
      <Container size="md">
        <Text c="red">{t('wineries:detail.notFound')}</Text>
      </Container>
    )
  }

  return (
    <Container size="md">
      <Stack gap="xl">
        <div>
          <Title order={1}>{t('wineries:edit.title')}</Title>
          <Text c="dimmed" size="lg">
            {t('wineries:edit.subtitle')}
          </Text>
        </div>

        <WineryForm
          winery={winery}
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/wineries/$id', params: { id } })}
          isLoading={updateWinery.isPending}
        />
      </Stack>
    </Container>
  )
}
