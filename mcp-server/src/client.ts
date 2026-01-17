/**
 * Supabase client for MCP server
 * Uses Edge Function proxy for secure communication
 */

import type { Config } from './config.js';
import type { Wine, TastingNote, AddWineParams } from './types.js';

interface MCPProxyResponse<T> {
  wine?: Wine;
  wines?: Wine[];
  tasting_notes?: TastingNote[];
  error?: string;
}

export class SupabaseClient {
  private proxyUrl: string;
  private headers: Record<string, string>;

  constructor(config: Config) {
    // Edge Function URL
    this.proxyUrl = `${config.supabaseUrl}/functions/v1/mcp-server-proxy`;

    // Only need auth token, not anon key
    this.headers = {
      'Authorization': `Bearer ${config.userAuthToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch all wines for the authenticated user
   */
  async getWines(): Promise<Wine[]> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        action: 'list_wines',
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(`Failed to fetch wines: ${error.error || response.statusText}`);
    }

    const result = await response.json() as MCPProxyResponse<Wine[]>;

    if (result.error) {
      throw new Error(`Failed to fetch wines: ${result.error}`);
    }

    return result.wines || [];
  }

  /**
   * Fetch a single wine by ID with related data
   */
  async getWine(id: string): Promise<Wine | null> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        action: 'get_wine',
        params: { wine_id: id },
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(`Failed to fetch wine: ${error.error || response.statusText}`);
    }

    const result = await response.json() as MCPProxyResponse<Wine>;

    if (result.error) {
      throw new Error(`Failed to fetch wine: ${result.error}`);
    }

    return result.wine || null;
  }

  /**
   * Fetch tasting notes for a wine
   */
  async getTastingNotes(wineId: string): Promise<TastingNote[]> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        action: 'get_wine',
        params: { wine_id: wineId },
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(`Failed to fetch tasting notes: ${error.error || response.statusText}`);
    }

    const result = await response.json() as MCPProxyResponse<TastingNote[]>;

    if (result.error) {
      throw new Error(`Failed to fetch tasting notes: ${result.error}`);
    }

    return result.tasting_notes || [];
  }

  /**
   * Add a new wine
   */
  async addWine(params: AddWineParams): Promise<Wine> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        action: 'add_wine',
        params: { wine: params },
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(`Failed to add wine: ${error.error || response.statusText}`);
    }

    const result = await response.json() as MCPProxyResponse<Wine>;

    if (result.error) {
      throw new Error(`Failed to add wine: ${result.error}`);
    }

    if (!result.wine) {
      throw new Error('Failed to add wine: No wine returned');
    }

    return result.wine;
  }
}
