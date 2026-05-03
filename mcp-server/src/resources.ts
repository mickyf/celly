/**
 * MCP Resource handlers for Celly
 */

import type { SupabaseClient } from './client.js';
import type { Wine, Winery } from './types.js';

export async function getWineCollectionResource(client: SupabaseClient): Promise<string> {
  const wines = await client.getWines();

  if (wines.length === 0) {
    return 'No wines in your cellar yet.';
  }

  const currentYear = new Date().getFullYear();
  const readyToDrink: Wine[] = [];
  const drinkSoon: Wine[] = [];
  const ageFurther: Wine[] = [];
  const noWindow: Wine[] = [];

  for (const wine of wines) {
    if (!wine.drink_window_start && !wine.drink_window_end) {
      noWindow.push(wine);
    } else if (wine.drink_window_start && wine.drink_window_start > currentYear) {
      ageFurther.push(wine);
    } else if (wine.drink_window_end && wine.drink_window_end < currentYear) {
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

export async function getWineDetailResource(client: SupabaseClient, id: string): Promise<string> {
  const wine = await client.getWine(id);

  if (!wine) {
    return `Wine with ID ${id} not found.`;
  }

  let markdown = `# ${wine.name}\n\n`;
  markdown += `**ID:** ${wine.id}\n`;

  if (wine.vintage) {
    markdown += `**Vintage:** ${wine.vintage}\n`;
  }

  if (wine.grapes && wine.grapes.length > 0) {
    markdown += `**Grapes:** ${wine.grapes.join(', ')}\n`;
  }

  markdown += `**Quantity:** ${wine.quantity} bottle${wine.quantity !== 1 ? 's' : ''}\n`;

  if (wine.bottle_size) {
    markdown += `**Bottle Size:** ${wine.bottle_size}\n`;
  }

  if (wine.winery_id) {
    markdown += `**Winery ID:** ${wine.winery_id}\n`;
  }

  if (wine.drink_window_start || wine.drink_window_end) {
    const from = wine.drink_window_start ?? 'now';
    const until = wine.drink_window_end ?? 'indefinitely';
    markdown += `**Drinking Window:** ${from} - ${until}\n`;

    const currentYear = new Date().getFullYear();
    if (wine.drink_window_start && wine.drink_window_start > currentYear) {
      const years = wine.drink_window_start - currentYear;
      markdown += `*Status: Age further (ready in ${years} year${years !== 1 ? 's' : ''})*\n`;
    } else if (wine.drink_window_end && wine.drink_window_end < currentYear) {
      markdown += `*Status: Past peak - drink soon!*\n`;
    } else {
      markdown += `*Status: Ready to drink*\n`;
    }
  }

  if (wine.price) {
    markdown += `**Price:** CHF ${wine.price.toFixed(2)}\n`;
  }

  markdown += '\n';

  if (wine.food_pairings) {
    markdown += `## Food Pairings\n\n${wine.food_pairings}\n\n`;
  }

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
  } catch {
    // Tasting notes are optional
  }

  return markdown;
}

export async function getWineryCollectionResource(client: SupabaseClient): Promise<string> {
  const wineries = await client.getWineries();

  if (wineries.length === 0) {
    return 'No wineries yet.';
  }

  let markdown = '# Wineries\n\n';
  markdown += `Total wineries: ${wineries.length}\n\n`;

  for (const winery of wineries) {
    markdown += formatWineryEntry(winery);
  }

  return markdown;
}

export async function getWineryDetailResource(client: SupabaseClient, id: string): Promise<string> {
  const { winery, wines } = await client.getWinery(id);

  if (!winery) {
    return `Winery with ID ${id} not found.`;
  }

  let markdown = `# ${winery.name}\n\n`;
  markdown += `**ID:** ${winery.id}\n`;
  if (winery.country_code) {
    markdown += `**Country:** ${winery.country_code}\n`;
  }
  markdown += '\n';

  if (wines.length > 0) {
    markdown += `## Wines (${wines.length})\n\n`;
    markdown += formatWineList(wines);
  } else {
    markdown += '_No wines associated with this winery yet._\n';
  }

  return markdown;
}

function formatWineList(wines: Wine[]): string {
  let markdown = '';

  for (const wine of wines) {
    markdown += `### ${wine.name}`;
    if (wine.vintage) {
      markdown += ` (${wine.vintage})`;
    }
    markdown += '\n';
    markdown += `- ID: ${wine.id}\n`;

    if (wine.grapes && wine.grapes.length > 0) {
      markdown += `- Grapes: ${wine.grapes.join(', ')}\n`;
    }

    markdown += `- Quantity: ${wine.quantity}\n`;

    if (wine.drink_window_start || wine.drink_window_end) {
      const from = wine.drink_window_start ?? 'now';
      const until = wine.drink_window_end ?? 'indefinitely';
      markdown += `- Drinking window: ${from}-${until}\n`;
    }

    if (wine.price) {
      markdown += `- Price: CHF ${wine.price.toFixed(2)}\n`;
    }

    markdown += '\n';
  }

  return markdown;
}

function formatWineryEntry(winery: Winery): string {
  let markdown = `### ${winery.name}\n`;
  markdown += `- ID: ${winery.id}\n`;
  if (winery.country_code) {
    markdown += `- Country: ${winery.country_code}\n`;
  }
  markdown += '\n';
  return markdown;
}
