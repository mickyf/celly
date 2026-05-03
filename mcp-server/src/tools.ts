/**
 * MCP Tool handlers for Celly
 */

import type { SupabaseClient } from './client.js';
import type { AddWineParams, AddWineryParams } from './types.js';
import {
  getWineCollectionResource,
  getWineDetailResource,
  getWineryCollectionResource,
  getWineryDetailResource,
} from './resources.js';

export async function addWineTool(
  client: SupabaseClient,
  params: AddWineParams
): Promise<string> {
  const wine = await client.addWine(params);

  let response = `Successfully added wine: ${wine.name}`;

  if (wine.vintage) {
    response += ` (${wine.vintage})`;
  }

  response += '\n\n**Details:**\n';
  response += `- ID: ${wine.id}\n`;
  response += `- Quantity: ${wine.quantity}\n`;

  if (wine.grapes && wine.grapes.length > 0) {
    response += `- Grapes: ${wine.grapes.join(', ')}\n`;
  }

  if (wine.drink_window_start || wine.drink_window_end) {
    const from = wine.drink_window_start ?? 'now';
    const until = wine.drink_window_end ?? 'indefinitely';
    response += `- Drinking window: ${from}-${until}\n`;
  }

  if (wine.price) {
    response += `- Price: CHF ${wine.price.toFixed(2)}\n`;
  }

  if (wine.bottle_size) {
    response += `- Bottle size: ${wine.bottle_size}\n`;
  }

  if (wine.winery_id) {
    response += `- Winery ID: ${wine.winery_id}\n`;
  }

  return response;
}

export async function listWinesTool(client: SupabaseClient): Promise<string> {
  return getWineCollectionResource(client);
}

export async function getWineTool(client: SupabaseClient, wineId: string): Promise<string> {
  return getWineDetailResource(client, wineId);
}

export async function addWineryTool(
  client: SupabaseClient,
  params: AddWineryParams
): Promise<string> {
  const winery = await client.addWinery(params);

  let response = `Successfully added winery: ${winery.name}\n\n`;
  response += '**Details:**\n';
  response += `- ID: ${winery.id}\n`;
  if (winery.country_code) {
    response += `- Country: ${winery.country_code}\n`;
  }

  return response;
}

export async function listWineriesTool(client: SupabaseClient): Promise<string> {
  return getWineryCollectionResource(client);
}

export async function getWineryTool(client: SupabaseClient, wineryId: string): Promise<string> {
  return getWineryDetailResource(client, wineryId);
}
