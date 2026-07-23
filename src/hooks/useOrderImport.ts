import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import Fuse from 'fuse.js'
import { supabase } from '../lib/supabase'
import { showMutationError } from '../lib/mutationError'
import { parseOrderDocument, type ParsedWine } from '../lib/claude'
import type { Database } from '../types/database'

type Winery = Database['public']['Tables']['wineries']['Row']
type WineInsert = Database['public']['Tables']['wines']['Insert']
type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert']

export interface ImportRowWinery {
  // Either an existing winery picked by the user / matched by Fuse,
  // or a new winery to be created (no id yet).
  existingId: string | null
  newName: string | null
  newCountryCode: string | null
}

export interface ImportRow {
  /** Stable id for React keys — not persisted. */
  rowId: string
  /** Checkbox state: true = persist this row, false = ignore. */
  included: boolean
  /**
   * If non-null the row restocks the referenced wine; the other fields
   * (name, vintage, winery, …) describe the existing wine and are read-only
   * in the UI. If null the row creates a new wine using the editable fields.
   */
  existingWineId: string | null
  name: string
  wineType: string | null
  vintage: number | null
  quantity: number
  price: number | null
  bottleSize: string | null
  winery: ImportRowWinery | null
}

export interface ImportSummary {
  batchId: string
  created: number
  restocked: number
  skipped: number
  failures: { name: string; error: string }[]
}

export const useParseOrderDocument = () => {
  const { t } = useTranslation(['wines'])

  return useMutation({
    mutationFn: async ({ file }: { file: File }): Promise<{ wines: ParsedWine[]; explanation: string }> => {
      return parseOrderDocument(file)
    },
    onError: (error) =>
      showMutationError(t, error, {
        title: t('wines:import.errors.parseTitle'),
        hook: 'useParseOrderDocument',
      }),
  })
}

interface BulkImportInput {
  rows: ImportRow[]
  /** Existing wineries — passed in so the hook stays decoupled from useWineries. */
  existingWineries: Pick<Winery, 'id' | 'name'>[]
}

export const useBulkImportWines = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rows, existingWineries }: BulkImportInput): Promise<ImportSummary> => {
      return Sentry.startSpan(
        {
          name: 'wine.bulkImport',
          op: 'data.bulk_mutation',
          attributes: { 'rows.count': rows.length },
        },
        async (span) => {
          const batchId = crypto.randomUUID()

          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) throw new Error(t('wines:import.errors.notAuthenticated'))

          const failures: ImportSummary['failures'] = []

          // Phase A — match existing wineries with Fuse for any "new" winery names
          // the user accepted (existingId is null but newName is set).
          const fuse = new Fuse(existingWineries, {
            keys: ['name'],
            threshold: 0.3,
            includeScore: true,
          })
          // Map<lowercased newName, wineryId>
          const wineryByNewName = new Map<string, string>()
          // Names that didn't match and need to be inserted in Phase B.
          const namesToCreate = new Map<string, { name: string; country_code: string }>()

          for (const row of rows) {
            if (!row.included) continue
            if (row.existingWineId) continue // restock keeps the existing wine's winery
            if (!row.winery) continue
            if (row.winery.existingId) continue
            const newName = row.winery.newName?.trim()
            if (!newName) continue
            const key = newName.toLowerCase()
            if (wineryByNewName.has(key) || namesToCreate.has(key)) continue
            const matches = fuse.search(newName)
            if (matches.length > 0) {
              wineryByNewName.set(key, matches[0].item.id)
            } else {
              namesToCreate.set(key, {
                name: newName,
                country_code: row.winery.newCountryCode ?? '',
              })
            }
          }

          // Phase B — single insert for all unmatched winery names.
          if (namesToCreate.size > 0) {
            const inserts = Array.from(namesToCreate.values()).map((w) => ({
              name: w.name,
              country_code: w.country_code || null,
              user_id: user.id,
            }))
            const { data: created, error: wineryErr } = await supabase
              .from('wineries')
              .insert(inserts)
              .select('id, name')
            if (wineryErr) {
              Sentry.captureException(wineryErr, {
                tags: { source: 'useBulkImportWines', op: 'wineries.insert' },
              })
              throw wineryErr
            }
            for (const w of created ?? []) {
              wineryByNewName.set(w.name.toLowerCase(), w.id)
            }
          }

          const resolveWineryId = (row: ImportRow): string | null => {
            if (!row.winery) return null
            if (row.winery.existingId) return row.winery.existingId
            const key = row.winery.newName?.trim().toLowerCase()
            return key ? wineryByNewName.get(key) ?? null : null
          }

          // Step 3 — bulk-insert "create new" wines.
          const newWineRows = rows.filter((r) => r.included && r.existingWineId === null)
          let createdCount = 0
          if (newWineRows.length > 0) {
            const inserts: WineInsert[] = newWineRows.map((r) => ({
              user_id: user.id,
              name: r.name,
              wine_type: r.wineType,
              vintage: r.vintage,
              quantity: r.quantity,
              price: r.price,
              bottle_size: r.bottleSize,
              winery_id: resolveWineryId(r),
              import_batch_id: batchId,
            }))
            const { data: createdWines, error: winesErr } = await supabase
              .from('wines')
              .insert(inserts)
              .select('id, name')
            if (winesErr) {
              Sentry.captureException(winesErr, {
                tags: { source: 'useBulkImportWines', op: 'wines.insert' },
              })
              for (const r of newWineRows) {
                failures.push({ name: r.name, error: winesErr.message })
              }
            } else {
              createdCount = createdWines?.length ?? 0
            }
          }

          // Step 4 — bulk-insert restock movements.
          const restockRows = rows.filter((r) => r.included && r.existingWineId !== null)
          let restockedCount = 0
          if (restockRows.length > 0) {
            const stockNote = t('wines:import.stockNote')
            const inserts: StockMovementInsert[] = restockRows.map((r) => ({
              user_id: user.id,
              wine_id: r.existingWineId!,
              movement_type: 'in',
              quantity: r.quantity,
              notes: stockNote,
              import_batch_id: batchId,
            }))
            const { data: createdMoves, error: stockErr } = await supabase
              .from('stock_movements')
              .insert(inserts)
              .select('id')
            if (stockErr) {
              Sentry.captureException(stockErr, {
                tags: { source: 'useBulkImportWines', op: 'stock_movements.insert' },
              })
              for (const r of restockRows) {
                failures.push({ name: r.name, error: stockErr.message })
              }
            } else {
              restockedCount = createdMoves?.length ?? 0
            }
          }

          const skippedCount = rows.filter((r) => !r.included).length

          queryClient.invalidateQueries({ queryKey: ['wines'] })
          queryClient.invalidateQueries({ queryKey: ['wineries'] })
          queryClient.invalidateQueries({ queryKey: ['stock_movements'] })

          span.setAttribute('rows.created', createdCount)
          span.setAttribute('rows.restocked', restockedCount)
          span.setAttribute('rows.skipped', skippedCount)
          span.setAttribute('rows.failed', failures.length)
          span.setStatus({ code: 1, message: 'ok' })

          return {
            batchId,
            created: createdCount,
            restocked: restockedCount,
            skipped: skippedCount,
            failures,
          }
        },
      )
    },
    onError: (error) =>
      showMutationError(t, error, {
        title: t('wines:import.errors.saveTitle'),
        hook: 'useBulkImportWines',
      }),
  })
}
