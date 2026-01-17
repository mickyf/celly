import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']
type NewWine = Database['public']['Tables']['wines']['Insert']
type UpdateWine = Database['public']['Tables']['wines']['Update']

export const useWines = (wineryId?: string) => {
  return useQuery({
    queryKey: wineryId ? ['wines', 'winery', wineryId] : ['wines'],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: wineryId ? 'Fetching wines for winery' : 'Fetching wines',
        level: 'info',
        data: wineryId ? { wineryId } : undefined,
      })

      let query = supabase
        .from('wines')
        .select('*')
        .order('created_at', { ascending: false })

      if (wineryId) {
        query = query.eq('winery_id', wineryId)
      }

      const { data, error } = await query

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_query',
            table: 'wines',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'wines',
              operation: 'select',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }

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
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Adding wine',
        level: 'info',
        data: {
          hasWinery: !!wine.winery_id,
          hasPhoto: !!wine.photo_url,
          grapeCount: wine.grapes?.length || 0,
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
            operation: 'addWine',
          },
        })
        throw error
      }

      const { data, error } = await supabase
        .from('wines')
        .insert({ ...wine, user_id: user.id })
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wines',
            operation: 'insert',
          },
          contexts: {
            supabase: {
              table: 'wines',
              operation: 'insert',
              error_code: error.code,
              error_hint: error.hint,
            },
            wine: {
              has_winery: !!wine.winery_id,
              has_photo: !!wine.photo_url,
              grape_count: wine.grapes?.length || 0,
            },
          },
        })
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Wine added successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.wineAdded.title'),
        message: t('wines:notifications.wineAdded.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      // Error already captured in mutationFn
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
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Updating wine',
        level: 'info',
        data: { wineId: id },
      })

      const { data, error } = await supabase
        .from('wines')
        .update(wine)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wines',
            operation: 'update',
          },
          contexts: {
            supabase: {
              table: 'wines',
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
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wines', data.id] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Wine updated successfully',
        level: 'info',
      })

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
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Deleting wine',
        level: 'info',
        data: { wineId: id },
      })

      const { error } = await supabase.from('wines').delete().eq('id', id)

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wines',
            operation: 'delete',
          },
          contexts: {
            supabase: {
              table: 'wines',
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
      queryClient.invalidateQueries({ queryKey: ['wines'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Wine deleted successfully',
        level: 'info',
      })

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
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Uploading wine photo',
        level: 'info',
        data: {
          wineId,
          fileSize: file.size,
          fileType: file.type,
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
            operation: 'uploadWinePhoto',
          },
        })
        throw error
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${wineId}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('wine-images')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        Sentry.captureException(uploadError, {
          tags: {
            errorType: 'supabase_storage',
            bucket: 'wine-images',
            operation: 'upload',
          },
          contexts: {
            storage: {
              bucket: 'wine-images',
              file_path: filePath,
              file_size: file.size,
            },
          },
        })
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('wine-images').getPublicUrl(filePath)

      return publicUrl
    },
    onSuccess: () => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Wine photo uploaded successfully',
        level: 'info',
      })

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

export const useMergeWines = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Merging wines',
        level: 'info',
        data: { sourceId, targetId },
      })

      // Validate that source and target are different
      if (sourceId === targetId) {
        const error = new Error(t('wines:errors.cannotMergeSameWine'))
        Sentry.captureException(error, {
          tags: {
            errorType: 'validation',
            operation: 'mergeWines',
          },
        })
        throw error
      }

      // Get both wines to combine quantities and handle photo
      const { data: sourceWine, error: sourceError } = await supabase
        .from('wines')
        .select('*')
        .eq('id', sourceId)
        .single()

      if (sourceError) throw sourceError

      const { data: targetWine, error: targetError } = await supabase
        .from('wines')
        .select('*')
        .eq('id', targetId)
        .single()

      if (targetError) throw targetError

      // Update tasting notes from source to target
      const { error: tastingNotesError } = await supabase
        .from('tasting_notes')
        .update({ wine_id: targetId })
        .eq('wine_id', sourceId)

      if (tastingNotesError) {
        Sentry.captureException(tastingNotesError, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'tasting_notes',
            operation: 'update',
          },
        })
        throw tastingNotesError
      }

      // Update stock movements from source to target
      const { error: stockMovementsError } = await supabase
        .from('stock_movements')
        .update({ wine_id: targetId })
        .eq('wine_id', sourceId)

      if (stockMovementsError) {
        Sentry.captureException(stockMovementsError, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'stock_movements',
            operation: 'update',
          },
        })
        throw stockMovementsError
      }

      // Update wine locations from source to target
      const { error: wineLocationsError } = await supabase
        .from('wine_locations')
        .update({ wine_id: targetId })
        .eq('wine_id', sourceId)

      if (wineLocationsError) {
        Sentry.captureException(wineLocationsError, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wine_locations',
            operation: 'update',
          },
        })
        throw wineLocationsError
      }

      // Update target wine quantity (sum of both) and photo if target doesn't have one
      const newQuantity = (targetWine.quantity || 0) + (sourceWine.quantity || 0)
      const updateData: UpdateWine = { quantity: newQuantity }

      // If target doesn't have a photo but source does, use source's photo
      if (!targetWine.photo_url && sourceWine.photo_url) {
        updateData.photo_url = sourceWine.photo_url
      }

      const { error: updateError } = await supabase
        .from('wines')
        .update(updateData)
        .eq('id', targetId)

      if (updateError) {
        Sentry.captureException(updateError, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wines',
            operation: 'update',
          },
        })
        throw updateError
      }

      // Delete the source wine (CASCADE will handle related records if any remain)
      const { error: deleteError } = await supabase
        .from('wines')
        .delete()
        .eq('id', sourceId)

      if (deleteError) {
        Sentry.captureException(deleteError, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'wines',
            operation: 'delete',
          },
        })
        throw deleteError
      }

      return {
        movedQuantity: sourceWine.quantity || 0,
        totalQuantity: newQuantity,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['wine_locations'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Wines merged successfully',
        level: 'info',
        data: { totalQuantity: data.totalQuantity },
      })

      notifications.show({
        title: t('wines:notifications.winesMerged.title'),
        message: t('wines:notifications.winesMerged.message', {
          quantity: data.movedQuantity,
          total: data.totalQuantity
        }),
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
