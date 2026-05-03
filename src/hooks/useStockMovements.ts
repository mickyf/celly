import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { showMutationError } from '../lib/mutationError'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'

type StockMovement = Database['public']['Tables']['stock_movements']['Row']
type NewStockMovement = Database['public']['Tables']['stock_movements']['Insert']
type Wine = Database['public']['Tables']['wines']['Row']
type UpdateStockMovement = Database['public']['Tables']['stock_movements']['Update']

export const useStockMovements = (wineId?: string) => {
  return useQuery({
    queryKey: wineId ? ['stock_movements', wineId] : ['stock_movements'],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: 'Fetching stock movements',
        level: 'info',
        data: { wineId },
      })

      let query = supabase
        .from('stock_movements')
        .select('id, wine_id, movement_type, quantity, movement_date, notes, user_id')
        .order('movement_date', { ascending: false })

      if (wineId) {
        query = query.eq('wine_id', wineId)
      }

      const { data, error } = await query

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_query',
            table: 'stock_movements',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'stock_movements',
              operation: 'select',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }
      return data as StockMovement[]
    },
  })
}

export const useAddStockMovement = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    onMutate: async (movement: NewStockMovement) => {
      // Snapshot wines list and apply the quantity delta optimistically so
      // the dashboard / wines list reflects the change before the round-trip
      // completes. The DB trigger updates wine.quantity authoritatively; we
      // refetch the affected wine in onSuccess.
      await queryClient.cancelQueries({ queryKey: ['wines'] })
      const previousWines = queryClient.getQueryData<Wine[]>(['wines'])
      const delta = movement.movement_type === 'in' ? movement.quantity : -movement.quantity
      queryClient.setQueryData<Wine[]>(['wines'], (old) =>
        old?.map((w) =>
          w.id === movement.wine_id ? { ...w, quantity: (w.quantity ?? 0) + delta } : w,
        ),
      )
      return { previousWines }
    },
    mutationFn: async (movement: NewStockMovement) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Adding stock movement',
        level: 'info',
        data: {
          wineId: movement.wine_id,
          movementType: movement.movement_type,
          quantity: movement.quantity,
        },
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const error = new Error('Not authenticated')
        Sentry.captureException(error, {
          tags: {
            errorType: 'auth',
            operation: 'addStockMovement',
          },
        })
        throw error
      }

      const { data, error } = await supabase
        .from('stock_movements')
        .insert({ ...movement, user_id: user.id })
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'stock_movements',
            operation: 'insert',
          },
          contexts: {
            supabase: {
              table: 'stock_movements',
              operation: 'insert',
              error_code: error.code,
              error_hint: error.hint,
            },
            stock_movement: {
              movement_type: movement.movement_type,
              quantity: movement.quantity,
            },
          },
        })
        throw error
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements', data.wine_id] })
      // Refetch the canonical quantity for the affected wine. The wines list
      // was already updated optimistically in onMutate.
      queryClient.invalidateQueries({ queryKey: ['wines', data.wine_id] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Stock movement added successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.stockMovementAdded.title'),
        message: t('wines:notifications.stockMovementAdded.message'),
        color: 'green',
      })
    },
    onError: (error, _variables, context) => {
      // Roll back the optimistic wines list update if it was applied.
      if (context?.previousWines) {
        queryClient.setQueryData(['wines'], context.previousWines)
      }
      showMutationError(t, error)
    },
  })
}

export const useUpdateStockMovement = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...movement }: UpdateStockMovement & { id: string }) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Updating stock movement',
        level: 'info',
        data: { id, movementType: movement.movement_type, quantity: movement.quantity },
      })

      const { data, error } = await supabase
        .from('stock_movements')
        .update(movement)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'stock_movements',
            operation: 'update',
          },
          contexts: {
            supabase: {
              table: 'stock_movements',
              operation: 'update',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wines', data.wine_id] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Stock movement updated successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.stockMovementUpdated.title'),
        message: t('wines:notifications.stockMovementUpdated.message'),
        color: 'green',
      })
    },
    onError: (error) => showMutationError(t, error),
  })
}

export const useDeleteStockMovement = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, wineId }: { id: string; wineId: string }) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Deleting stock movement',
        level: 'info',
        data: { id, wineId },
      })

      const { error } = await supabase
        .from('stock_movements')
        .delete()
        .eq('id', id)

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'stock_movements',
            operation: 'delete',
          },
          contexts: {
            supabase: {
              table: 'stock_movements',
              operation: 'delete',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }
      return wineId
    },
    onSuccess: (wineId) => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements', wineId] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wines', wineId] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Stock movement deleted successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.stockMovementDeleted.title'),
        message: t('wines:notifications.stockMovementDeleted.message'),
        color: 'green',
      })
    },
    onError: (error) => showMutationError(t, error),
  })
}
