import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'

type WineLocation = Database['public']['Tables']['wine_locations']['Row']
type NewWineLocation = Database['public']['Tables']['wine_locations']['Insert']
type UpdateWineLocation = Database['public']['Tables']['wine_locations']['Update']

type Wine = Database['public']['Tables']['wines']['Row']

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
                .order('created_at', { ascending: true })

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

            return data as (WineLocation & {
                cellar: { name: string },
                wine: Wine
            })[]
        },
    })
}

export const useAddWineLocation = () => {
    const { t } = useTranslation(['wines'])
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (location: NewWineLocation) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('wine_locations')
                .insert({ ...location, user_id: user.id })
                .select()
                .single()

            if (error) {
                Sentry.captureException(error, {
                    tags: { errorType: 'supabase_mutation', table: 'wine_locations', operation: 'insert' },
                    contexts: {
                        supabase: { error_code: error.code, error_hint: error.hint, error_details: error.details },
                        wine_location: {
                            wine_id: location.wine_id,
                            cellar_id: location.cellar_id,
                            quantity: location.quantity,
                        },
                    },
                })
                throw error
            }

            return data as WineLocation
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
            queryClient.invalidateQueries({ queryKey: ['wine_locations', data.wine_id] })
            queryClient.invalidateQueries({ queryKey: ['wines', data.wine_id] })
        },
        onError: (error) => {
            notifications.show({
                title: t('wines:notifications.locationError.title', { defaultValue: 'Location not saved' }),
                message: error instanceof Error ? error.message : String(error),
                color: 'red',
                autoClose: 8000,
            })
        },
    })
}

export const useUpdateWineLocation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...location }: UpdateWineLocation & { id: string }) => {
            const { data, error } = await supabase
                .from('wine_locations')
                .update(location)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                Sentry.captureException(error)
                throw error
            }

            return data as WineLocation
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
            queryClient.invalidateQueries({ queryKey: ['wine_locations', data.wine_id] })
            queryClient.invalidateQueries({ queryKey: ['wines', data.wine_id] })
        },
    })
}

export const useDeleteWineLocation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, wineId }: { id: string, wineId: string }) => {
            const { error } = await supabase
                .from('wine_locations')
                .delete()
                .eq('id', id)

            if (error) {
                Sentry.captureException(error)
                throw error
            }

            return { id, wineId }
        },
        onSuccess: ({ wineId }) => {
            queryClient.invalidateQueries({ queryKey: ['wine_locations'] })
            queryClient.invalidateQueries({ queryKey: ['wine_locations', wineId] })
            queryClient.invalidateQueries({ queryKey: ['wines', wineId] })
        },
    })
}
