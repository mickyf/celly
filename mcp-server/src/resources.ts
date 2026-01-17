/**
 * MCP Resource handlers for Celly
 */

import type { SupabaseClient } from './client.js';
import type { Wine } from './types.js';

/**
 * Format wine collection as markdown resource
 */
export async function getWineCollectionResource(client: SupabaseClient): Promise<string> {
  const wines = await client.getWines();

  if (wines.length === 0) {
    return 'No wines in your cellar yet.';
  }

  // Group wines by drinking status
  const currentYear = new Date().getFullYear();
  const readyToDrink: Wine[] = [];
  const drinkSoon: Wine[] = [];
  const ageFurther: Wine[] = [];
  const noWindow: Wine[] = [];

  for (const wine of wines) {
    if (!wine.drink_from && !wine.drink_until) {
      noWindow.push(wine);
    } else if (wine.drink_from && wine.drink_from > currentYear) {
      ageFurther.push(wine);
    } else if (wine.drink_until && wine.drink_until < currentYear) {
      drinkSoon.push(wine);
    } else {
      readyToDrink.push(wine);
    }
  }

  let markdown = '# Wine Collection\n\n';
  markdown += `Total wines: ${wines.length}\n\n`;

  if (readyToDrink.length > 0) {
    markdown += '## Ready to Drink\n\n';
    markdown += formatWineList(readyToDrink);
  }

  if (drinkSoon.length > 0) {
    markdown += '## Past Peak (Drink Soon)\n\n';
    markdown += formatWineList(drinkSoon);
  }

  if (ageFurther.length > 0) {
    markdown += '## Age Further\n\n';
    markdown += formatWineList(ageFurther);
  }

  if (noWindow.length > 0) {
    markdown += '## No Drinking Window Set\n\n';
    markdown += formatWineList(noWindow);
  }

  return markdown;
}

/**
 * Format a single wine as detailed markdown resource
 */
export async function getWineDetailResource(client: SupabaseClient, id: string): Promise<string> {
  const wine = await client.getWine(id);

  if (!wine) {
    return `Wine with ID ${id} not found.`;
  }

  let markdown = `# ${wine.name}\n\n`;

  // Basic information
  if (wine.vintage) {
    markdown += `**Vintage:** ${wine.vintage}\n`;
  }

  if (wine.grapes && wine.grapes.length > 0) {
    markdown += `**Grapes:** ${wine.grapes.join(', ')}\n`;
  }

  markdown += `**Quantity:** ${wine.quantity} bottle${wine.quantity !== 1 ? 's' : ''}\n`;

  if (wine.bottle_size && wine.bottle_size !== 750) {
    markdown += `**Bottle Size:** ${wine.bottle_size}ml\n`;
  }

  // Drinking window
  if (wine.drink_from || wine.drink_until) {
    const from = wine.drink_from || 'now';
    const until = wine.drink_until || 'indefinitely';
    markdown += `**Drinking Window:** ${from} - ${until}\n`;

    const currentYear = new Date().getFullYear();
    if (wine.drink_from && wine.drink_from > currentYear) {
      markdown += `*Status: Age further (ready in ${wine.drink_from - currentYear} year${wine.drink_from - currentYear !== 1 ? 's' : ''})*\n`;
    } else if (wine.drink_until && wine.drink_until < currentYear) {
      markdown += `*Status: Past peak - drink soon!*\n`;
    } else {
      markdown += `*Status: Ready to drink*\n`;
    }
  }

  // Price
  if (wine.price) {
    markdown += `**Price:** CHF ${wine.price.toFixed(2)}\n`;
  }

  markdown += '\n';

  // Food pairings
  if (wine.food_pairings) {
    markdown += `## Food Pairings\n\n${wine.food_pairings}\n\n`;
  }

  // Tasting notes
  try {
    const notes = await client.getTastingNotes(wine.id);
    if (notes.length > 0) {
      markdown += '## Tasting Notes\n\n';
      for (const note of notes) {
        const stars = '⭐'.repeat(note.rating);
        markdown += `### ${note.tasting_date} - ${stars}\n\n`;
        if (note.notes) {
          markdown += `${note.notes}\n\n`;
        }
      }
    }
  } catch (error) {
    // Tasting notes are optional, don't fail if they can't be fetched
  }

  return markdown;
}

/**
 * Helper function to format a list of wines
 */
function formatWineList(wines: Wine[]): string {
  let markdown = '';

  for (const wine of wines) {
    markdown += `### ${wine.name}`;
    if (wine.vintage) {
      markdown += ` (${wine.vintage})`;
    }
    markdown += '\n';

    if (wine.grapes && wine.grapes.length > 0) {
      markdown += `- Grapes: ${wine.grapes.join(', ')}\n`;
    }

    markdown += `- Quantity: ${wine.quantity}\n`;

    if (wine.drink_from || wine.drink_until) {
      const from = wine.drink_from || 'now';
      const until = wine.drink_until || 'indefinitely';
      markdown += `- Drinking window: ${from}-${until}\n`;
    }

    if (wine.price) {
      markdown += `- Price: CHF ${wine.price.toFixed(2)}\n`;
    }

    markdown += '\n';
  }

  return markdown;
}
