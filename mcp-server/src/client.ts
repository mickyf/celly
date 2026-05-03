/**
 * Supabase client for MCP server
 * Uses Edge Function proxy for secure communication
 */

import type { Config } from './config.js';
import type { Wine, Winery, TastingNote, AddWineParams, AddWineryParams } from './types.js';

interface MCPProxyResponse {
  wine?: Wine;
  wines?: Wine[];
  winery?: Winery;
  wineries?: Winery[];
  tasting_notes?: TastingNote[];
  error?: string;
}

export class SupabaseClient {
  private proxyUrl: string;
  private headers: Record<string, string>;

  constructor(config: Config) {
    this.proxyUrl = `${config.supabaseUrl}/functions/v1/mcp-server-proxy`;
    this.headers = {
      'Authorization': `Bearer ${config.userAuthToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async call(action: string, params?: Record<string, unknown>): Promise<MCPProxyResponse> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ action, params }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error || response.statusText);
    }

    const result = await response.json() as MCPProxyResponse;
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  async getWines(): Promise<Wine[]> {
    const result = await this.call('list_wines');
    return result.wines || [];
  }

  async getWine(id: string): Promise<Wine | null> {
    const result = await this.call('get_wine', { wine_id: id });
    return result.wine || null;
  }

  async getTastingNotes(wineId: string): Promise<TastingNote[]> {
    const result = await this.call('get_wine', { wine_id: wineId });
    return result.tasting_notes || [];
  }

  async addWine(params: AddWineParams): Promise<Wine> {
    const result = await this.call('add_wine', { wine: params });
    if (!result.wine) {
      throw new Error('No wine returned');
    }
    return result.wine;
  }

  async getWineries(): Promise<Winery[]> {
    const result = await this.call('list_wineries');
    return result.wineries || [];
  }

  async getWinery(id: string): Promise<{ winery: Winery | null; wines: Wine[] }> {
    const result = await this.call('get_winery', { winery_id: id });
    return { winery: result.winery || null, wines: result.wines || [] };
  }

  async addWinery(params: AddWineryParams): Promise<Winery> {
    const result = await this.call('add_winery', { winery: params });
    if (!result.winery) {
      throw new Error('No winery returned');
    }
    return result.winery;
  }
}
