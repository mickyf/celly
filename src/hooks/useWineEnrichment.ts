import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { enrichWineData } from '../lib/claude'
import { useAddWinery } from './useWineries'
import { useUpdateWine } from './useWines'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

interface EnrichmentResult {
  fieldsUpdated: string[]
  wineryCreated: boolean
}

export const useEnrichWine = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()
  const addWinery = useAddWinery()
  const updateWine = useUpdateWine()

  return useMutation({
    mutationFn: async ({ wine }: { wine: Wine }): Promise<EnrichmentResult> => {
      // Pre-flight check: Validate at least one field is empty
      const needsGrapes = !wine.grapes || wine.grapes.length === 0
      const needsVintage = wine.vintage === null
      const needsDrinkWindow =
        wine.drink_window_start === null || wine.drink_window_end === null
      const needsWinery = wine.winery_id === null

      if (!needsGrapes && !needsVintage && !needsDrinkWindow && !needsWinery) {
        throw new Error(t('wines:enrichment.errors.allFieldsFilled'))
      }

      // Fetch existing wineries for AI matching
      const { data: existingWineries } = await supabase
        .from('wineries')
        .select('id, name, country_code')
        .order('name', { ascending: true })

      // Filter wineries with valid country codes
      const validWineries = (existingWineries || []).filter(
        (w): w is { id: string; name: string; country_code: string } =>
          w.country_code !== null
      )

      // Call AI enrichment with existing wineries list
      const { enrichmentData, error } = await enrichWineData(
        wine.name,
        wine.vintage,
        validWineries
      )

      if (error || !enrichmentData) {
        throw new Error(error || t('wines:enrichment.errors.noData'))
      }

      // Show low confidence warning
      if (enrichmentData.confidence === 'low') {
        notifications.show({
          title: t('wines:enrichment.lowConfidence.title'),
          message: t('wines:enrichment.lowConfidence.message'),
          color: 'yellow',
          autoClose: 8000,
        })
      }

      // Prepare update data
      const updateData: Partial<Wine> = {}
      const fieldsUpdated: string[] = []
      let wineryCreated = false

      // Update grapes if needed
      if (
        needsGrapes &&
        enrichmentData.grapes &&
        enrichmentData.grapes.length > 0
      ) {
        updateData.grapes = enrichmentData.grapes
        fieldsUpdated.push(t('wines:form.labels.grapeVarieties'))
      }

      // Update vintage if needed
      if (needsVintage && enrichmentData.vintage) {
        updateData.vintage = enrichmentData.vintage
        fieldsUpdated.push(t('wines:form.labels.vintage'))
      }

      // Update drinking window if needed
      if (needsDrinkWindow && enrichmentData.drinkingWindow) {
        updateData.drink_window_start = enrichmentData.drinkingWindow.start
        updateData.drink_window_end = enrichmentData.drinkingWindow.end
        fieldsUpdated.push(t('wines:form.sections.drinkingWindow'))
      }

      // Handle winery matching and creation
      if (needsWinery && enrichmentData.winery) {
        const { name, countryCode, matchedExistingId } = enrichmentData.winery

        // Check if AI matched an existing winery
        if (matchedExistingId) {
          // AI found a match - use the existing winery
          updateData.winery_id = matchedExistingId
          fieldsUpdated.push(t('wines:form.labels.winery'))
        } else {
          // AI didn't find a match - create new winery
          try {
            const newWinery = await addWinery.mutateAsync({
              name,
              country_code: countryCode,
            })
            updateData.winery_id = newWinery.id
            fieldsUpdated.push(t('wines:form.labels.winery'))
            wineryCreated = true
          } catch (error) {
            // If winery creation fails, continue without it
            console.error('Failed to create winery:', error)
          }
        }
      }

      // Check if any fields were actually updated
      if (fieldsUpdated.length === 0) {
        throw new Error(t('wines:enrichment.errors.noUpdates'))
      }

      // Update the wine
      await updateWine.mutateAsync({
        id: wine.id,
        ...updateData,
      })

      return { fieldsUpdated, wineryCreated }
    },
    onSuccess: ({ fieldsUpdated, wineryCreated }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wineries'] })

      // Show success notification
      notifications.show({
        title: t('wines:enrichment.success.title'),
        message: t('wines:enrichment.success.message', {
          count: fieldsUpdated.length,
          fields: fieldsUpdated.join(', '),
        }),
        color: 'green',
        autoClose: 5000,
      })

      // Show winery created notification if applicable
      if (wineryCreated) {
        notifications.show({
          title: t('wines:enrichment.wineryCreated.title'),
          message: t('wines:enrichment.wineryCreated.message'),
          color: 'blue',
          autoClose: 5000,
        })
      }
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:enrichment.errors.title'),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}
