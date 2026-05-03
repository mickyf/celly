import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import { showMutationError } from '../lib/mutationError'
import type { Database } from '../types/database'

type UserSettingRow = Database['public']['Tables']['user_settings']['Row']
type Json = Database['public']['Tables']['user_settings']['Row']['value']

export const useUserSettings = () => {
    return useQuery<UserSettingRow[]>({
        queryKey: ['user_settings'],
        queryFn: async () => {
            Sentry.addBreadcrumb({
                category: 'data.query',
                message: 'Fetching user settings',
                level: 'info',
            })

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')

            if (error) {
                Sentry.captureException(error, {
                    tags: {
                        errorType: 'supabase_query',
                        table: 'user_settings',
                        operation: 'select',
                    },
                })
                throw error
            }
            return data ?? []
        },
    })
}

export const useUserSetting = (key: string) => {
    return useQuery<UserSettingRow | null>({
        queryKey: ['user_settings', key],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('key', key)
                .maybeSingle()

            if (error) {
                Sentry.captureException(error, {
                    tags: {
                        errorType: 'supabase_query',
                        table: 'user_settings',
                        operation: 'select',
                        key,
                    },
                })
                throw error
            }
            return data
        },
    })
}

export const useUpdateUserSetting = () => {
    const { t } = useTranslation(['common'])
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ key, value }: { key: string; value: Json }) => {
            Sentry.addBreadcrumb({
                category: 'data.mutation',
                message: 'Updating user setting',
                level: 'info',
                data: { key },
            })

            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                throw new Error('Not authenticated')
            }

            const { data, error } = await supabase
                .from('user_settings')
                .upsert(
                    {
                        user_id: user.id,
                        key,
                        value,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id,key' },
                )
                .select()
                .single()

            if (error) {
                Sentry.captureException(error, {
                    tags: {
                        errorType: 'supabase_mutation',
                        table: 'user_settings',
                        operation: 'upsert',
                        key,
                    },
                })
                throw error
            }
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['user_settings'] })
            queryClient.invalidateQueries({ queryKey: ['user_settings', variables.key] })

            notifications.show({
                title: t('common:notifications.settingUpdated.title', { defaultValue: 'Setting Updated' }),
                message: t('common:notifications.settingUpdated.message', { defaultValue: 'Your setting has been saved.' }),
                color: 'green',
            })
        },
        onError: (error) => showMutationError(t, error),
    })
}
