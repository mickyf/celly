import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'

type StockMovement = Database['public']['Tables']['stock_movements']['Row']
type NewStockMovement = Database['public']['Tables']['stock_movements']['Insert']
type UpdateStockMovement = Database['public']['Tables']['stock_movements']['Update']

export const useStockMovements = (wineId?: string) => {
  return useQuery({
    queryKey: wineId ? ['stock_movements', wineId] : ['stock_movements'],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('movement_date', { ascending: false })

      if (wineId) {
        query = query.eq('wine_id', wineId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as StockMovement[]
    },
  })
}

export const useAddStockMovement = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (movement: NewStockMovement) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('stock_movements')
        .insert({ ...movement, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wines', data.wine_id] })
      notifications.show({
        title: t('wines:notifications.stockMovementAdded.title'),
        message: t('wines:notifications.stockMovementAdded.message'),
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

export const useUpdateStockMovement = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...movement }: UpdateStockMovement & { id: string }) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .update(movement)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wines', data.wine_id] })
      notifications.show({
        title: t('wines:notifications.stockMovementUpdated.title'),
        message: t('wines:notifications.stockMovementUpdated.message'),
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

export const useDeleteStockMovement = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, wineId }: { id: string; wineId: string }) => {
      const { error } = await supabase
        .from('stock_movements')
        .delete()
        .eq('id', id)

      if (error) throw error
      return wineId
    },
    onSuccess: (wineId) => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements', wineId] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wines', wineId] })
      notifications.show({
        title: t('wines:notifications.stockMovementDeleted.title'),
        message: t('wines:notifications.stockMovementDeleted.message'),
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
