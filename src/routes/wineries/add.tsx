import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Stack } from '@mantine/core'
import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { WineryForm, type WineryFormValues } from '../../components/WineryForm'
import { useAddWinery } from '../../hooks/useWineries'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/wineries/add')({
  component: AddWinery,
})

function AddWinery() {
  const { t } = useTranslation(['wineries'])
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const addWinery = useAddWinery()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (values: WineryFormValues) => {
    try {
      await addWinery.mutateAsync({
        name: values.name,
        country_code: values.country_code,
      })

      // Navigate back to wineries list
      navigate({ to: '/wineries' })
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
        <div>
          <Title order={1}>{t('wineries:add.title')}</Title>
          <Text c="dimmed" size="lg">
            {t('wineries:add.subtitle')}
          </Text>
        </div>

        <WineryForm
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/wineries' })}
          isLoading={addWinery.isPending}
        />
      </Stack>
    </Container>
  )
}
