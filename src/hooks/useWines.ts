import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']
type NewWine = Database['public']['Tables']['wines']['Insert']
type UpdateWine = Database['public']['Tables']['wines']['Update']

export const useWines = () => {
  return useQuery({
    queryKey: ['wines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Wine[]
    },
  })
}

export const useWine = (id: string) => {
  return useQuery({
    queryKey: ['wines', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Wine
    },
    enabled: !!id,
  })
}

export const useAddWine = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (wine: NewWine) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('wines')
        .insert({ ...wine, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      notifications.show({
        title: t('wines:notifications.wineAdded.title'),
        message: t('wines:notifications.wineAdded.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}

export const useUpdateWine = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...wine }: UpdateWine & { id: string }) => {
      const { data, error } = await supabase
        .from('wines')
        .update(wine)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wines', data.id] })
      notifications.show({
        title: t('wines:notifications.wineUpdated.title'),
        message: t('wines:notifications.wineUpdated.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}

export const useDeleteWine = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wines').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      notifications.show({
        title: t('wines:notifications.wineDeleted.title'),
        message: t('wines:notifications.wineDeleted.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}

export const useUploadWinePhoto = () => {
  const { t } = useTranslation(['wines'])

  return useMutation({
    mutationFn: async ({ file, wineId }: { file: File; wineId: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${wineId}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('wine-images')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('wine-images').getPublicUrl(filePath)

      return publicUrl
    },
    onSuccess: () => {
      notifications.show({
        title: t('wines:notifications.photoUploaded.title'),
        message: t('wines:notifications.photoUploaded.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}
