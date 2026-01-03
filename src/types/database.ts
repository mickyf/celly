export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      wines: {
        Row: {
          id: string
          user_id: string
          name: string
          grapes: string[]
          vintage: number | null
          quantity: number
          price: number | null
          drink_window_start: number | null
          drink_window_end: number | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          grapes: string[]
          vintage?: number | null
          quantity?: number
          price?: number | null
          drink_window_start?: number | null
          drink_window_end?: number | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          grapes?: string[]
          vintage?: number | null
          quantity?: number
          price?: number | null
          drink_window_start?: number | null
          drink_window_end?: number | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasting_notes: {
        Row: {
          id: string
          wine_id: string
          user_id: string
          rating: number
          notes: string | null
          tasted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          wine_id: string
          user_id: string
          rating: number
          notes?: string | null
          tasted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          wine_id?: string
          user_id?: string
          rating?: number
          notes?: string | null
          tasted_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
