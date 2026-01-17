import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

type Winery = Tables<'wineries'>
type NewWinery = Omit<TablesInsert<'wineries'>, 'user_id'>
type UpdateWinery = TablesUpdate<'wineries'>

export const useWineries = () => {
  return useQuery({
    queryKey: ['wineries'],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: 'Fetching wineries',
        level: 'info',
      })

      const { data, error } = await supabase
        .from('wineries')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_query',
            table: 'wineries',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'wineries',
              operation: 'select',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }
      return data as Winery[]
    },
  })
}

export const useWinery = (id: string) => {
  return useQuery({
    queryKey: ['wineries', id],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: 'Fetching winery',
        level: 'info',
        data: { id },
      })

      const { data, error } = await supabase
        .from('wineries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_query',
            table: 'wineries',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'wineries',
              operation: 'select',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }
      return data as Winery
    },
    enabled: !!id,
  })
}

export const useWineryWineCount = (wineryId: string) => {
  return useQuery({
    queryKey: ['wineries', wineryId, 'wineCount'],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: 'Fetching winery wine count',
        level: 'info',
        data: { wineryId },
      })

      const { count, error } = await supabase
        .from('wines')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', wineryId)

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_query',
            table: 'wines',
            operation: 'count',
          },
          contexts: {
            supabase: {
              table: 'wines',
              operation: 'count',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }
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
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Adding winery',
        level: 'info',
        data: {
          name: winery.name,
          countryCode: winery.country_code,
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
            operation: 'addWinery',
          },
        })
        throw error
      }

      const { data, error } = await supabase
        .from('wineries')
        .insert({ ...winery, user_id: user.id })
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wineries',
            operation: 'insert',
          },
          contexts: {
            supabase: {
              table: 'wineries',
              operation: 'insert',
              error_code: error.code,
              error_hint: error.hint,
            },
            winery: {
              country_code: winery.country_code,
              name_length: winery.name.length,
            },
          },
        })
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wineries'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Winery added successfully',
        level: 'info',
      })

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
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Updating winery',
        level: 'info',
        data: { id, name: winery.name },
      })

      const { data, error } = await supabase
        .from('wineries')
        .update(winery)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wineries',
            operation: 'update',
          },
          contexts: {
            supabase: {
              table: 'wineries',
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
      queryClient.invalidateQueries({ queryKey: ['wineries'] })
      queryClient.invalidateQueries({ queryKey: ['wineries', data.id] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Winery updated successfully',
        level: 'info',
      })

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
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Deleting winery',
        level: 'info',
        data: { id },
      })

      // Check wine count before deleting
      const { count } = await supabase
        .from('wines')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', id)

      if (count && count > 0) {
        const error = new Error(t('wineries:errors.hasWines', { count }))
        Sentry.captureException(error, {
          tags: {
            errorType: 'validation',
            operation: 'deleteWinery',
          },
          contexts: {
            winery: {
              id,
              wine_count: count,
            },
          },
        })
        throw error
      }

      const { error } = await supabase.from('wineries').delete().eq('id', id)

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wineries',
            operation: 'delete',
          },
          contexts: {
            supabase: {
              table: 'wineries',
              operation: 'delete',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wineries'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Winery deleted successfully',
        level: 'info',
      })

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

export const useMergeWineries = () => {
  const { t } = useTranslation(['wineries'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Merging wineries',
        level: 'info',
        data: { sourceId, targetId },
      })

      // Validate that source and target are different
      if (sourceId === targetId) {
        const error = new Error(t('wineries:errors.cannotMergeSameWinery'))
        Sentry.captureException(error, {
          tags: {
            errorType: 'validation',
            operation: 'mergeWineries',
          },
        })
        throw error
      }

      // Get wine count for source winery
      const { count } = await supabase
        .from('wines')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', sourceId)

      // Update all wines from source winery to target winery
      const { error: updateError } = await supabase
        .from('wines')
        .update({ winery_id: targetId })
        .eq('winery_id', sourceId)

      if (updateError) {
        Sentry.captureException(updateError, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wines',
            operation: 'update',
          },
          contexts: {
            supabase: {
              table: 'wines',
              operation: 'update',
              error_code: updateError.code,
              error_hint: updateError.hint,
            },
          },
        })
        throw updateError
      }

      // Delete the source winery (now that no wines reference it)
      const { error: deleteError } = await supabase
        .from('wineries')
        .delete()
        .eq('id', sourceId)

      if (deleteError) {
        Sentry.captureException(deleteError, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wineries',
            operation: 'delete',
          },
          contexts: {
            supabase: {
              table: 'wineries',
              operation: 'delete',
              error_code: deleteError.code,
              error_hint: deleteError.hint,
            },
          },
        })
        throw deleteError
      }

      return { movedWineCount: count || 0 }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wineries'] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Wineries merged successfully',
        level: 'info',
        data: { movedWineCount: data.movedWineCount },
      })

      notifications.show({
        title: t('wineries:notifications.wineriesMerged.title'),
        message: t('wineries:notifications.wineriesMerged.message', { count: data.movedWineCount }),
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
