/**
 * MCP Tool handlers for Celly
 */

import type { SupabaseClient } from './client.js';
import type { AddWineParams } from './types.js';
import { getWineCollectionResource, getWineDetailResource } from './resources.js';

/**
 * Add a new wine to the collection
 */
export async function addWineTool(
  client: SupabaseClient,
  params: AddWineParams
): Promise<string> {
  try {
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

    if (wine.drink_from || wine.drink_until) {
      const from = wine.drink_from || 'now';
      const until = wine.drink_until || 'indefinitely';
      response += `- Drinking window: ${from}-${until}\n`;
    }

    if (wine.price) {
      response += `- Price: CHF ${wine.price.toFixed(2)}\n`;
    }

    if (wine.bottle_size && wine.bottle_size !== 750) {
      response += `- Bottle size: ${wine.bottle_size}ml\n`;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to add wine: ${error.message}`);
    }
    throw new Error('Failed to add wine: Unknown error');
  }
}

/**
 * List all wines in the collection
 */
export async function listWinesTool(client: SupabaseClient): Promise<string> {
  try {
    return await getWineCollectionResource(client);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to list wines: ${error.message}`);
    }
    throw new Error('Failed to list wines: Unknown error');
  }
}

/**
 * Get detailed information about a specific wine
 */
export async function getWineTool(client: SupabaseClient, wineId: string): Promise<string> {
  try {
    return await getWineDetailResource(client, wineId);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get wine details: ${error.message}`);
    }
    throw new Error('Failed to get wine details: Unknown error');
  }
}
