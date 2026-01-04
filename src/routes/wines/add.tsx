import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Container, Title, Text, Stack } from '@mantine/core'
import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { WineForm, type WineFormValues } from '../../components/WineForm'
import { useAddWine, useUploadWinePhoto } from '../../hooks/useWines'

export const Route = createFileRoute('/wines/add')({
  component: AddWine,
})

function AddWine() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const addWine = useAddWine()
  const uploadPhoto = useUploadWinePhoto()

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
        grapes: values.grapes,
        vintage: values.vintage,
        quantity: values.quantity,
        price: values.price,
        drink_window_start: values.drink_window_start,
        drink_window_end: values.drink_window_end,
        photo_url: photoUrl,
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

      // Navigate back to wines list
      navigate({ to: '/wines' })
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
        <div>
          <Title order={1}>Add Wine</Title>
          <Text c="dimmed" size="lg">
            Add a new bottle to your cellar
          </Text>
        </div>

        <WineForm
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/wines' })}
          isLoading={addWine.isPending || uploadPhoto.isPending}
        />
      </Stack>
    </Container>
  )
}
