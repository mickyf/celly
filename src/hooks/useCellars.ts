import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { Tables, TablesInsert } from '../types/database'

type Cellar = Tables<'cellars'>
type NewCellar = Omit<TablesInsert<'cellars'>, 'user_id'>

export const useCellars = () => {
    return useQuery({
        queryKey: ['cellars'],
        queryFn: async () => {
            Sentry.addBreadcrumb({
                category: 'data.query',
                message: 'Fetching cellars',
                level: 'info',
            })

            const { data, error } = await supabase
                .from('cellars')
                .select('*')
                .order('name', { ascending: true })

            if (error) {
                Sentry.captureException(error, {
                    tags: {
                        errorType: 'supabase_query',
                        table: 'cellars',
                        operation: 'select',
                    },
                })
                throw error
            }
            return data as Cellar[]
        },
    })
}

export const useAddCellar = () => {
    const { t } = useTranslation(['wines'])
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (cellar: NewCellar) => {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('cellars')
                .insert({ ...cellar, user_id: user.id })
                .select()
                .single()

            if (error) {
                Sentry.captureException(error, {
                    tags: {
                        errorType: 'supabase_mutation',
                        table: 'cellars',
                        operation: 'insert',
                    },
                })
                throw error
            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cellars'] })
            notifications.show({
                title: t('wines:notifications.cellarAdded.title', { defaultValue: 'Cellar added' }),
                message: t('wines:notifications.cellarAdded.message', { defaultValue: 'Cellar has been added' }),
                color: 'green',
            })
        },
    })
}
