/**
 * Type definitions for Celly MCP server
 */

export interface Wine {
  id: string;
  name: string;
  vintage?: number;
  grapes?: string[];
  quantity: number;
  drink_from?: number;
  drink_until?: number;
  price?: number;
  bottle_size?: number;
  food_pairings?: string;
  photo_url?: string;
  winery_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Winery {
  id: string;
  name: string;
  country_code?: string;
  created_at: string;
  updated_at: string;
}

export interface TastingNote {
  id: string;
  wine_id: string;
  rating: number;
  notes?: string;
  tasting_date: string;
  created_at: string;
  updated_at: string;
}

export interface AddWineParams {
  name: string;
  vintage?: number;
  grapes?: string[];
  quantity?: number;
  drink_from?: number;
  drink_until?: number;
  price?: number;
  bottle_size?: number;
  food_pairings?: string;
  winery_id?: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
  } | null;
}
