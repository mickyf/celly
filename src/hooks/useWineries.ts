import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

type Winery = Tables<'wineries'>
type NewWinery = Omit<TablesInsert<'wineries'>, 'user_id'>
type UpdateWinery = TablesUpdate<'wineries'>

export const useWineries = () => {
  return useQuery({
    queryKey: ['wineries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wineries')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data as Winery[]
    },
  })
}

export const useWinery = (id: string) => {
  return useQuery({
    queryKey: ['wineries', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wineries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Winery
    },
    enabled: !!id,
  })
}

export const useWineryWineCount = (wineryId: string) => {
  return useQuery({
    queryKey: ['wineries', wineryId, 'wineCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('wines')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', wineryId)

      if (error) throw error
      return count || 0
    },
    enabled: !!wineryId,
  })
}

export const useAddWinery = () => {
  const { t } = useTranslation(['wineries'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (winery: NewWinery) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('wineries')
        .insert({ ...winery, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wineries'] })
      notifications.show({
        title: t('wineries:notifications.wineryAdded.title'),
        message: t('wineries:notifications.wineryAdded.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wineries:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}

export const useUpdateWinery = () => {
  const { t } = useTranslation(['wineries'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...winery }: UpdateWinery & { id: string }) => {
      const { data, error } = await supabase
        .from('wineries')
        .update(winery)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wineries'] })
      queryClient.invalidateQueries({ queryKey: ['wineries', data.id] })
      notifications.show({
        title: t('wineries:notifications.wineryUpdated.title'),
        message: t('wineries:notifications.wineryUpdated.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wineries:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}

export const useDeleteWinery = () => {
  const { t } = useTranslation(['wineries'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Check wine count before deleting
      const { count } = await supabase
        .from('wines')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', id)

      if (count && count > 0) {
        throw new Error(t('wineries:errors.hasWines', { count }))
      }

      const { error } = await supabase.from('wineries').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wineries'] })
      notifications.show({
        title: t('wineries:notifications.wineryDeleted.title'),
        message: t('wineries:notifications.wineryDeleted.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wineries:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}
