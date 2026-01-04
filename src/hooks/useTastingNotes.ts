import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

type TastingNote = Tables<'tasting_notes'>
type NewTastingNote = TablesInsert<'tasting_notes'>
type UpdateTastingNote = TablesUpdate<'tasting_notes'>

export const useTastingNotes = (wineId?: string) => {
  return useQuery({
    queryKey: ['tasting_notes', wineId],
    queryFn: async () => {
      let query = supabase
        .from('tasting_notes')
        .select('*')
        .order('tasted_at', { ascending: false })

      if (wineId) {
        query = query.eq('wine_id', wineId)
      }

      const { data, error } = await query

      if (error) throw error
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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasting_notes')
        .insert({ ...note, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasting_notes', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })
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
      const { data, error } = await supabase
        .from('tasting_notes')
        .update(note)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasting_notes', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })
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
      const { error } = await supabase.from('tasting_notes').delete().eq('id', id)

      if (error) throw error
      return wineId
    },
    onSuccess: (wineId) => {
      queryClient.invalidateQueries({ queryKey: ['tasting_notes', wineId] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })
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
