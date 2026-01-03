import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import type { Database } from '../types/database'

type TastingNote = Database['public']['Tables']['tasting_notes']['Row']
type NewTastingNote = Database['public']['Tables']['tasting_notes']['Insert']
type UpdateTastingNote = Database['public']['Tables']['tasting_notes']['Update']

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
        title: 'Success',
        message: 'Tasting note added',
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      })
    },
  })
}

export const useUpdateTastingNote = () => {
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
        title: 'Success',
        message: 'Tasting note updated',
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      })
    },
  })
}

export const useDeleteTastingNote = () => {
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
        title: 'Success',
        message: 'Tasting note deleted',
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      })
    },
  })
}
