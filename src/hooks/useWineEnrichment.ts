import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import { enrichWineData, enrichWineFromImage } from '../lib/claude'
import { useAddWinery } from './useWineries'
import { useUpdateWine } from './useWines'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']

interface EnrichmentResult {
  fieldsUpdated: string[]
  wineryCreated: boolean
}

interface BulkEnrichmentResult {
  total: number
  successful: number
  failed: number
  skipped: number
  errors: Array<{ wineName: string; error: string }>
}

export const useEnrichWine = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()
  const addWinery = useAddWinery()
  const updateWine = useUpdateWine()

  return useMutation({
    mutationFn: async ({ wine }: { wine: Wine }): Promise<EnrichmentResult> => {
      return Sentry.startSpan(
        {
          name: 'wine.enrichment',
          op: 'ai.enrichment',
          attributes: {
            'wine.id': wine.id,
            'wine.name': wine.name,
          },
        },
        async (span) => {
          Sentry.addBreadcrumb({
            category: 'ai.enrichment',
            message: 'Starting wine enrichment',
            level: 'info',
            data: { wineId: wine.id, wineName: wine.name },
          })

          // Pre-flight check: Validate at least one field is empty
          const needsGrapes = !wine.grapes || wine.grapes.length === 0
          const needsVintage = wine.vintage === null
          const needsDrinkWindow =
            wine.drink_window_start === null || wine.drink_window_end === null
          const needsWinery = wine.winery_id === null
          const needsPrice = wine.price === null
          const needsFoodPairings = !wine.food_pairings || wine.food_pairings.trim().length === 0

          if (!needsGrapes && !needsVintage && !needsDrinkWindow && !needsWinery && !needsPrice && !needsFoodPairings) {
            const error = new Error(t('wines:enrichment.errors.allFieldsFilled'))
            Sentry.captureException(error, {
              tags: {
                errorType: 'validation',
                operation: 'enrichWine',
              },
            })
            throw error
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
          // (AI errors are tracked in claude.ts)
          const { enrichmentData, error } = await enrichWineData(
            wine.name,
            wine.vintage,
            validWineries
          )

          if (error || !enrichmentData) {
            const err = new Error(error || t('wines:enrichment.errors.noData'))
            Sentry.captureException(err, {
              tags: {
                errorType: 'ai_enrichment',
                operation: 'enrichWine',
              },
              contexts: {
                wine: {
                  id: wine.id,
                  name: wine.name,
                  vintage: wine.vintage,
                },
              },
            })
            throw err
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

          // Update price if needed
          if (needsPrice && enrichmentData.price) {
            updateData.price = enrichmentData.price
            fieldsUpdated.push(t('wines:form.labels.pricePerBottle'))
          }

          // Update food pairings if needed
          if (needsFoodPairings && enrichmentData.foodPairings) {
            updateData.food_pairings = enrichmentData.foodPairings
            fieldsUpdated.push(t('wines:form.labels.foodPairings'))
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
            const error = new Error(t('wines:enrichment.errors.noUpdates'))
            Sentry.captureException(error, {
              tags: {
                errorType: 'validation',
                operation: 'enrichWine',
              },
            })
            throw error
          }

          // Update the wine (errors tracked in updateWine hook)
          await updateWine.mutateAsync({
            id: wine.id,
            ...updateData,
          })

          span.setAttribute('enrichment.fields_updated', fieldsUpdated.length)
          span.setAttribute('enrichment.winery_created', wineryCreated)
          span.setStatus({ code: 1, message: 'ok' })

          return { fieldsUpdated, wineryCreated }
        }
      )
    },
    onSuccess: ({ fieldsUpdated, wineryCreated }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wineries'] })

      Sentry.addBreadcrumb({
        category: 'ai.enrichment',
        message: 'Wine enrichment completed successfully',
        level: 'info',
        data: {
          fieldsUpdated: fieldsUpdated.length,
          wineryCreated,
        },
      })

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

export const useEnrichWineFromImage = () => {
  const { t } = useTranslation(['wines'])

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      return Sentry.startSpan(
        {
          name: 'wine.enrichmentFromImage',
          op: 'ai.enrichment',
          attributes: {
            'file.size': file.size,
            'file.type': file.type,
          },
        },
        async (span) => {
          Sentry.addBreadcrumb({
            category: 'ai.enrichment',
            message: 'Starting wine enrichment from image',
            level: 'info',
            data: { fileSize: file.size, fileType: file.type },
          })

          // Fetch existing wineries for AI matching
          const { data: existingWineries } = await supabase
            .from('wineries')
            .select('id, name, country_code')
            .order('name', { ascending: true })

          const validWineries = (existingWineries || []).filter(
            (w): w is { id: string; name: string; country_code: string } =>
              w.country_code !== null
          )

          const { enrichmentData, error } = await enrichWineFromImage(
            file,
            validWineries
          )

          if (error || !enrichmentData) {
            const err = new Error(error || t('wines:enrichment.errors.noData'))
            Sentry.captureException(err)
            throw err
          }

          if (enrichmentData.confidence === 'low') {
            notifications.show({
              title: t('wines:enrichment.lowConfidence.title'),
              message: t('wines:enrichment.lowConfidence.message'),
              color: 'yellow',
              autoClose: 8000,
            })
          }

          span.setStatus({ code: 1, message: 'ok' })
          return enrichmentData
        }
      )
    },
    onSuccess: (data) => {
      notifications.show({
        title: t('wines:enrichment.success.title'),
        message: t('wines:enrichment.successIdentified', { name: data.name }),
        color: 'green',
        autoClose: 5000,
      })
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

export const useBulkEnrichWines = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()
  const addWinery = useAddWinery()
  const updateWine = useUpdateWine()

  return useMutation({
    mutationFn: async ({
      wines,
      onProgress
    }: {
      wines: Wine[]
      onProgress?: (current: number, total: number) => void
    }): Promise<BulkEnrichmentResult> => {
      return Sentry.startSpan(
        {
          name: 'wine.bulkEnrichment',
          op: 'ai.bulk_enrichment',
          attributes: {
            'wine.count': wines.length,
          },
        },
        async (span) => {
          Sentry.addBreadcrumb({
            category: 'ai.enrichment',
            message: 'Starting bulk wine enrichment',
            level: 'info',
            data: { wineCount: wines.length },
          })

          const result: BulkEnrichmentResult = {
            total: wines.length,
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: [],
          }

          // Fetch existing wineries once for all enrichments
          const { data: existingWineries } = await supabase
            .from('wineries')
            .select('id, name, country_code')
            .order('name', { ascending: true })

          const validWineries = (existingWineries || []).filter(
            (w): w is { id: string; name: string; country_code: string } =>
              w.country_code !== null
          )

          // Process wines sequentially to avoid rate limits
          for (let i = 0; i < wines.length; i++) {
            const wine = wines[i]

            // Report progress
            onProgress?.(i, wines.length)

            await Sentry.startSpan(
              {
                name: 'wine.enrichSingle',
                op: 'ai.enrichment',
                attributes: {
                  'wine.index': i,
                  'wine.name': wine.name,
                },
              },
              async () => {
                try {
                  // Check if wine needs enrichment
                  const needsGrapes = !wine.grapes || wine.grapes.length === 0
                  const needsVintage = wine.vintage === null
                  const needsDrinkWindow =
                    wine.drink_window_start === null || wine.drink_window_end === null
                  const needsWinery = wine.winery_id === null
                  const needsPrice = wine.price === null
                  const needsFoodPairings = !wine.food_pairings || wine.food_pairings.trim().length === 0

                  if (!needsGrapes && !needsVintage && !needsDrinkWindow && !needsWinery && !needsPrice && !needsFoodPairings) {
                    result.skipped++
                    return
                  }

                  // Call AI enrichment
                  const { enrichmentData, error } = await enrichWineData(
                    wine.name,
                    wine.vintage,
                    validWineries
                  )

                  if (error || !enrichmentData) {
                    result.failed++
                    result.errors.push({
                      wineName: wine.name,
                      error: error || t('wines:enrichment.errors.noData'),
                    })
                    return
                  }

                  // Prepare update data
                  const updateData: Partial<Wine> = {}

                  // Update grapes if needed
                  if (
                    needsGrapes &&
                    enrichmentData.grapes &&
                    enrichmentData.grapes.length > 0
                  ) {
                    updateData.grapes = enrichmentData.grapes
                  }

                  // Update vintage if needed
                  if (needsVintage && enrichmentData.vintage) {
                    updateData.vintage = enrichmentData.vintage
                  }

                  // Update drinking window if needed
                  if (needsDrinkWindow && enrichmentData.drinkingWindow) {
                    updateData.drink_window_start = enrichmentData.drinkingWindow.start
                    updateData.drink_window_end = enrichmentData.drinkingWindow.end
                  }

                  // Update price if needed
                  if (needsPrice && enrichmentData.price) {
                    updateData.price = enrichmentData.price
                  }

                  // Update food pairings if needed
                  if (needsFoodPairings && enrichmentData.foodPairings) {
                    updateData.food_pairings = enrichmentData.foodPairings
                  }

                  // Handle winery matching and creation
                  if (needsWinery && enrichmentData.winery) {
                    const { name, countryCode, matchedExistingId } = enrichmentData.winery

                    if (matchedExistingId) {
                      updateData.winery_id = matchedExistingId
                    } else {
                      try {
                        const newWinery = await addWinery.mutateAsync({
                          name,
                          country_code: countryCode,
                        })
                        updateData.winery_id = newWinery.id
                        // Add to validWineries for future iterations
                        if (newWinery.country_code) {
                          validWineries.push({
                            id: newWinery.id,
                            name: newWinery.name,
                            country_code: newWinery.country_code,
                          })
                        }
                      } catch (error) {
                        console.error('Failed to create winery:', error)
                      }
                    }
                  }

                  // Only update if we have changes
                  if (Object.keys(updateData).length > 0) {
                    await updateWine.mutateAsync({
                      id: wine.id,
                      ...updateData,
                    })
                    result.successful++
                  } else {
                    result.skipped++
                  }
                } catch (error) {
                  result.failed++
                  result.errors.push({
                    wineName: wine.name,
                    error: error instanceof Error ? error.message : String(error),
                  })
                }
              }
            )

            // Add a small delay between requests to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }

          // Report final progress
          onProgress?.(wines.length, wines.length)

          span.setAttribute('wine.successful', result.successful)
          span.setAttribute('wine.failed', result.failed)
          span.setAttribute('wine.skipped', result.skipped)
          span.setStatus({ code: 1, message: 'ok' })

          return result
        }
      )
    },
    onSuccess: (result) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wineries'] })

      Sentry.addBreadcrumb({
        category: 'ai.enrichment',
        message: 'Bulk wine enrichment completed',
        level: 'info',
        data: {
          total: result.total,
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped,
        },
      })

      // Show summary notification
      if (result.successful > 0) {
        notifications.show({
          title: t('wines:bulkEnrichment.success.title'),
          message: t('wines:bulkEnrichment.success.message', {
            count: result.successful,
            total: result.total,
          }),
          color: 'green',
          autoClose: 5000,
        })
      }

      if (result.failed > 0) {
        notifications.show({
          title: t('wines:bulkEnrichment.partialFailure.title'),
          message: t('wines:bulkEnrichment.partialFailure.message', {
            count: result.failed,
          }),
          color: 'yellow',
          autoClose: 8000,
        })
      }

      if (result.successful === 0 && result.failed === 0) {
        notifications.show({
          title: t('wines:bulkEnrichment.noChanges.title'),
          message: t('wines:bulkEnrichment.noChanges.message'),
          color: 'blue',
          autoClose: 5000,
        })
      }
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:bulkEnrichment.errors.title'),
        message: error instanceof Error ? error.message : String(error),
        color: 'red',
        autoClose: 8000,
      })
    },
  })
}
