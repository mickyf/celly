import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'

type WineLocation = Database['public']['Tables']['wine_locations']['Row']
type Wine = Database['public']['Tables']['wines']['Row']

export type SlotWithWine = WineLocation & {
  cellar: { name: string } | null
  wine: Wine | null
}

export const useWineLocations = (wineId?: string, cellarId?: string) => {
  return useQuery({
    queryKey: wineId ? ['wine_locations', 'wine', wineId] : cellarId ? ['wine_locations', 'cellar', cellarId] : ['wine_locations'],
    queryFn: async () => {
      let query = supabase
        .from('wine_locations')
        .select(`
          *,
          cellar:cellars(name),
          wine:wines(*, winery:wineries(name))
        `)
        .order('shelf', { ascending: true })
        .order('row', { ascending: true })
        .order('column', { ascending: true })

      if (wineId) {
        query = query.eq('wine_id', wineId)
      }
      if (cellarId) {
        query = query.eq('cellar_id', cellarId)
      }

      const { data, error } = await query

      if (error) {
        Sentry.captureException(error)
        throw error
      }

      return data as SlotWithWine[]
    },
  })
}

interface CreateShelfInput {
  cellarId: string
  shelf: number
  rows: number
  columns: number
}

export const useCreateShelf = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cellarId, shelf, rows, columns }: CreateShelfInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const slots: Database['public']['Tables']['wine_locations']['Insert'][] = []
      for (let row = 1; row <= rows; row++) {
        for (let column = 1; column <= columns; column++) {
          slots.push({ cellar_id: cellarId, shelf, row, column, user_id: user.id })
        }
      }

      const { error } = await supabase.from('wine_locations').insert(slots)

      if (error) {
        Sentry.captureException(error, {
          tags: { errorType: 'supabase_mutation', table: 'wine_locations', operation: 'bulk_insert' },
          contexts: { supabase: { error_code: error.code, error_hint: error.hint, error_details: error.details } },
        })
        throw error
      }
    },
    onSuccess: (_, { cellarId }) => {
      queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
      queryClient.invalidateQueries({ queryKey: ['wine_locations', 'cellar', cellarId] })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.shelfError.title', { defaultValue: 'Could not create shelf' }),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}

interface AddSlotsInput {
  cellarId: string
  shelf: number
  coords: { row: number; column: number }[]
}

export const useAddSlots = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cellarId, shelf, coords }: AddSlotsInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const slots: Database['public']['Tables']['wine_locations']['Insert'][] = coords.map(
        ({ row, column }) => ({ cellar_id: cellarId, shelf, row, column, user_id: user.id })
      )

      const { error } = await supabase.from('wine_locations').insert(slots)

      if (error) {
        Sentry.captureException(error, {
          tags: { errorType: 'supabase_mutation', table: 'wine_locations', operation: 'add_slots' },
        })
        throw error
      }
    },
    onSuccess: (_, { cellarId }) => {
      queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
      queryClient.invalidateQueries({ queryKey: ['wine_locations', 'cellar', cellarId] })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.shelfError.title', { defaultValue: 'Could not add slots' }),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}

export const useDeleteSlots = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slotIds, cellarId }: { slotIds: string[]; cellarId: string }) => {
      if (slotIds.length === 0) return
      const { error } = await supabase.from('wine_locations').delete().in('id', slotIds)

      if (error) {
        Sentry.captureException(error)
        throw error
      }
      return { cellarId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
      if (result?.cellarId) {
        queryClient.invalidateQueries({ queryKey: ['wine_locations', 'cellar', result.cellarId] })
      }
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.shelfError.title', { defaultValue: 'Could not remove slots' }),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}

export const useDeleteShelf = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cellarId, shelf }: { cellarId: string; shelf: number }) => {
      const { error } = await supabase
        .from('wine_locations')
        .delete()
        .eq('cellar_id', cellarId)
        .eq('shelf', shelf)

      if (error) {
        Sentry.captureException(error)
        throw error
      }
    },
    onSuccess: (_, { cellarId }) => {
      queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
      queryClient.invalidateQueries({ queryKey: ['wine_locations', 'cellar', cellarId] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.shelfError.title', { defaultValue: 'Could not delete shelf' }),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}

export const usePlaceWine = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slotId, wineId }: { slotId: string; wineId: string }) => {
      const { data, error } = await supabase
        .from('wine_locations')
        .update({ wine_id: wineId })
        .eq('id', slotId)
        .select()
        .single()

      if (error) {
        Sentry.captureException(error)
        throw error
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
      queryClient.invalidateQueries({ queryKey: ['wine_locations', 'cellar', data.cellar_id] })
      if (data.wine_id) {
        queryClient.invalidateQueries({ queryKey: ['wine_locations', 'wine', data.wine_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.placeError.title', { defaultValue: 'Could not place wine' }),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}

export const useUnplaceWine = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slotId }: { slotId: string }) => {
      const { data, error } = await supabase
        .from('wine_locations')
        .update({ wine_id: null })
        .eq('id', slotId)
        .select()
        .single()

      if (error) {
        Sentry.captureException(error)
        throw error
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
      queryClient.invalidateQueries({ queryKey: ['wine_locations', 'cellar', data.cellar_id] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.placeError.title', { defaultValue: 'Could not update slot' }),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}
