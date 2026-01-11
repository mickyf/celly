import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

type TastingNote = Tables<'tasting_notes'>
type NewTastingNote = TablesInsert<'tasting_notes'>
type UpdateTastingNote = TablesUpdate<'tasting_notes'>

export const useTastingNotes = (wineId?: string) => {
  return useQuery({
    queryKey: ['tasting_notes', wineId],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: 'Fetching tasting notes',
        level: 'info',
        data: { wineId },
      })

      let query = supabase
        .from('tasting_notes')
        .select('*')
        .order('tasted_at', { ascending: false })

      if (wineId) {
        query = query.eq('wine_id', wineId)
      }

      const { data, error } = await query

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_query',
            table: 'tasting_notes',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'tasting_notes',
              operation: 'select',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }

      return data as TastingNote[]
    },
    enabled: !!wineId,
  })
}

export const useAddTastingNote = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (note: NewTastingNote) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Adding tasting note',
        level: 'info',
        data: {
          wineId: note.wine_id,
          rating: note.rating,
          hasNotes: !!note.notes,
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
            operation: 'addTastingNote',
          },
        })
        throw error
      }

      const { data, error } = await supabase
        .from('tasting_notes')
        .insert({ ...note, user_id: user.id })
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'tasting_notes',
            operation: 'insert',
          },
          contexts: {
            supabase: {
              table: 'tasting_notes',
              operation: 'insert',
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
      queryClient.invalidateQueries({ queryKey: ['tasting_notes', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Tasting note added successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.noteAdded.title'),
        message: t('wines:notifications.noteAdded.message'),
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

export const useUpdateTastingNote = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...note }: UpdateTastingNote & { id: string }) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Updating tasting note',
        level: 'info',
        data: { noteId: id },
      })

      const { data, error } = await supabase
        .from('tasting_notes')
        .update(note)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'tasting_notes',
            operation: 'update',
          },
          contexts: {
            supabase: {
              table: 'tasting_notes',
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
      queryClient.invalidateQueries({ queryKey: ['tasting_notes', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Tasting note updated successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.noteUpdated.title'),
        message: t('wines:notifications.noteUpdated.message'),
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

export const useDeleteTastingNote = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, wineId }: { id: string; wineId: string }) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Deleting tasting note',
        level: 'info',
        data: { noteId: id, wineId },
      })

      const { error } = await supabase.from('tasting_notes').delete().eq('id', id)

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'tasting_notes',
            operation: 'delete',
          },
          contexts: {
            supabase: {
              table: 'tasting_notes',
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
      queryClient.invalidateQueries({ queryKey: ['tasting_notes', wineId] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Tasting note deleted successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.noteDeleted.title'),
        message: t('wines:notifications.noteDeleted.message'),
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
