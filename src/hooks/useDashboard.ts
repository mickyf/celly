import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import * as Sentry from '@sentry/react'

export interface DashboardStats {
  totalBottles: number
  totalValue: number
  totalWines: number
  readyToDrink: number
  tastingNotesCount: number
  topGrapes: { grape: string; count: number }[]
  recentTastings: {
    id: string
    wine_name: string
    rating: number
    tasted_at: string | null
  }[]
  consumptionData: {
    date: string
    count: number
  }[]
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: 'Fetching dashboard statistics',
        level: 'info',
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const error = new Error('Not authenticated')
        Sentry.captureException(error, {
          tags: {
            errorType: 'auth',
            operation: 'getDashboardStats',
          },
        })
        throw error
      }

      // Fetch wines
      const { data: wines, error: winesError } = await supabase
        .from('wines')
        .select('*')
        .eq('user_id', user.id)

      if (winesError) {
        Sentry.captureException(winesError, {
          tags: {
            errorType: 'supabase_query',
            table: 'wines',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'wines',
              operation: 'select',
              error_code: winesError.code,
              error_hint: winesError.hint,
            },
          },
        })
        throw winesError
      }

      // Fetch tasting notes with wine names
      const { data: tastingNotes, error: notesError } = await supabase
        .from('tasting_notes')
        .select('id, rating, tasted_at, wine_id')
        .eq('user_id', user.id)
        .order('tasted_at', { ascending: false })
        .limit(5)

      if (notesError) {
        Sentry.captureException(notesError, {
          tags: {
            errorType: 'supabase_query',
            table: 'tasting_notes',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'tasting_notes',
              operation: 'select',
              error_code: notesError.code,
              error_hint: notesError.hint,
            },
          },
        })
        throw notesError
      }

      // Calculate statistics
      const totalBottles = wines?.reduce((sum, wine) => sum + (wine.quantity || 0), 0) || 0
      const totalValue =
        wines?.reduce((sum, wine) => sum + (wine.price || 0) * (wine.quantity || 0), 0) || 0
      const totalWines = wines?.length || 0

      // Count wines ready to drink
      const currentYear = new Date().getFullYear()
      const readyToDrink =
        wines?.filter(
          (wine) =>
            wine.drink_window_start &&
            wine.drink_window_end &&
            currentYear >= wine.drink_window_start &&
            currentYear <= wine.drink_window_end
        ).length || 0

      // Count all grapes
      const grapeCount: { [key: string]: number } = {}
      wines?.forEach((wine) => {
        wine.grapes?.forEach((grape) => {
          grapeCount[grape] = (grapeCount[grape] || 0) + 1
        })
      })

      // Get top 5 grapes
      const topGrapes = Object.entries(grapeCount)
        .map(([grape, count]) => ({ grape, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Get recent tastings with wine names
      const recentTastings = await Promise.all(
        (tastingNotes || []).map(async (note) => {
          const wine = wines?.find((w) => w.id === note.wine_id)
          return {
            id: note.id,
            wine_name: wine?.name || 'Unknown',
            rating: note.rating,
            tasted_at: note.tasted_at,
          }
        })
      )

      // Fetch stock movements for bottle count data
      const { data: stockMovements, error: stockMovementsError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('movement_date', { ascending: true })

      if (stockMovementsError) {
        Sentry.captureException(stockMovementsError, {
          tags: {
            errorType: 'supabase_query',
            table: 'stock_movements',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'stock_movements',
              operation: 'select',
              error_code: stockMovementsError.code,
              error_hint: stockMovementsError.hint,
            },
          },
        })
        throw stockMovementsError
      }

      // Build a monthly bottle-count series by walking movements forward from
      // the implied initial count. The initial count is `totalBottles` minus
      // the net delta of all movements, so the final point reconciles with the
      // current inventory.
      const sortedMovements = [...(stockMovements || [])].sort(
        (a, b) =>
          new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime()
      )

      const netDelta = sortedMovements.reduce((sum, m) => {
        const qty = m.quantity || 0
        if (m.movement_type === 'in') return sum + qty
        if (m.movement_type === 'out') return sum - qty
        return sum
      }, 0)

      const monthKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const monthlyCount: Record<string, number> = {}
      let count = totalBottles - netDelta

      for (const movement of sortedMovements) {
        const qty = movement.quantity || 0
        if (movement.movement_type === 'in') count += qty
        else if (movement.movement_type === 'out') count -= qty
        monthlyCount[monthKey(new Date(movement.movement_date))] = count
      }

      const consumptionData = Object.entries(monthlyCount)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const stats: DashboardStats = {
        totalBottles,
        totalValue,
        totalWines,
        readyToDrink,
        tastingNotesCount: tastingNotes?.length || 0,
        topGrapes,
        recentTastings,
        consumptionData,
      }

      return stats
    },
  })
}
