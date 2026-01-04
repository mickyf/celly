import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Stack, Loader, Center } from '@mantine/core'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { WineForm, type WineFormValues } from '../../../components/WineForm'
import { useWine, useUpdateWine, useUploadWinePhoto } from '../../../hooks/useWines'

export const Route = createFileRoute('/wines/$id/edit')({
  component: EditWine,
})

function EditWine() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { data: wine, isLoading } = useWine(id)
  const updateWine = useUpdateWine()
  const uploadPhoto = useUploadWinePhoto()

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
        grapes: values.grapes,
        vintage: values.vintage,
        quantity: values.quantity,
        price: values.price,
        drink_window_start: values.drink_window_start,
        drink_window_end: values.drink_window_end,
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

      // Navigate back to wines list
      navigate({ to: '/wines' })
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
        <Text c="red">Wine not found</Text>
      </Container>
    )
  }

  return (
    <Container size="md">
      <Stack gap="xl">
        <div>
          <Title order={1}>Edit Wine</Title>
          <Text c="dimmed" size="lg">
            Update wine information
          </Text>
        </div>

        <WineForm
          wine={wine}
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/wines/$id', params: { id } })}
          isLoading={updateWine.isPending || uploadPhoto.isPending}
        />
      </Stack>
    </Container>
  )
}
