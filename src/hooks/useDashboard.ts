import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Fetch wines
      const { data: wines, error: winesError } = await supabase
        .from('wines')
        .select('*')
        .eq('user_id', user.id)

      if (winesError) throw winesError

      // Fetch tasting notes with wine names
      const { data: tastingNotes, error: notesError } = await supabase
        .from('tasting_notes')
        .select('id, rating, tasted_at, wine_id')
        .eq('user_id', user.id)
        .order('tasted_at', { ascending: false })
        .limit(5)

      if (notesError) throw notesError

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

      const stats: DashboardStats = {
        totalBottles,
        totalValue,
        totalWines,
        readyToDrink,
        tastingNotesCount: tastingNotes?.length || 0,
        topGrapes,
        recentTastings,
      }

      return stats
    },
  })
}
