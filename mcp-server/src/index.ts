#!/usr/bin/env node

/**
 * Celly MCP Server
 *
 * A Model Context Protocol server for interacting with the Celly wine cellar
 * management application.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config.js';
import { SupabaseClient } from './client.js';
import {
  getWineCollectionResource,
  getWineDetailResource,
  getWineryCollectionResource,
  getWineryDetailResource,
} from './resources.js';
import {
  addWineTool,
  listWinesTool,
  getWineTool,
  addWineryTool,
  listWineriesTool,
  getWineryTool,
} from './tools.js';
import type { AddWineParams, AddWineryParams } from './types.js';

const config = loadConfig();
const client = new SupabaseClient(config);

const server = new Server(
  {
    name: 'celly-mcp-server',
    version: '1.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'celly://wines',
        name: 'Wine Collection',
        description: 'Your complete wine collection with drinking status',
        mimeType: 'text/markdown',
      },
      {
        uri: 'celly://wineries',
        name: 'Wineries',
        description: 'Your wineries with country and wine counts',
        mimeType: 'text/markdown',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === 'celly://wines') {
    const content = await getWineCollectionResource(client);
    return { contents: [{ uri, mimeType: 'text/markdown', text: content }] };
  }

  if (uri.startsWith('celly://wines/')) {
    const id = uri.replace('celly://wines/', '');
    const content = await getWineDetailResource(client, id);
    return { contents: [{ uri, mimeType: 'text/markdown', text: content }] };
  }

  if (uri === 'celly://wineries') {
    const content = await getWineryCollectionResource(client);
    return { contents: [{ uri, mimeType: 'text/markdown', text: content }] };
  }

  if (uri.startsWith('celly://wineries/')) {
    const id = uri.replace('celly://wineries/', '');
    const content = await getWineryDetailResource(client, id);
    return { contents: [{ uri, mimeType: 'text/markdown', text: content }] };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_wines',
        description: 'List all wines in the collection, organized by drinking status (ready to drink, age further, past peak)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_wine',
        description: 'Get detailed information about a specific wine including tasting notes',
        inputSchema: {
          type: 'object',
          properties: {
            wine_id: { type: 'string', description: 'ID of the wine to retrieve' },
          },
          required: ['wine_id'],
        },
      },
      {
        name: 'add_wine',
        description: 'Add a new wine to the collection. To associate it with a winery, first call list_wineries (or add_winery) to get the winery_id.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the wine' },
            wine_type: {
              type: 'string',
              enum: ['red', 'white', 'rose', 'sparkling', 'dessert', 'port'],
              description: 'Wine type / colour (optional)',
            },
            vintage: { type: 'number', description: 'Vintage year (optional)' },
            grapes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Grape varieties (optional)',
            },
            quantity: { type: 'number', description: 'Number of bottles (default: 1)' },
            drink_window_start: {
              type: 'number',
              description: 'Start of drinking window year (optional)',
            },
            drink_window_end: {
              type: 'number',
              description: 'End of drinking window year (optional)',
            },
            price: { type: 'number', description: 'Price in CHF (optional)' },
            bottle_size: {
              type: 'string',
              description: 'Bottle size as text, e.g. "75cl", "150cl", "375ml" (optional)',
            },
            food_pairings: {
              type: 'string',
              description: 'Food pairing suggestions in Swiss Standard German (optional)',
            },
            winery_id: { type: 'string', description: 'ID of the winery (optional)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_wineries',
        description: 'List all wineries with their IDs and country codes',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_winery',
        description: 'Get details about a specific winery including all associated wines',
        inputSchema: {
          type: 'object',
          properties: {
            winery_id: { type: 'string', description: 'ID of the winery to retrieve' },
          },
          required: ['winery_id'],
        },
      },
      {
        name: 'add_winery',
        description: 'Add a new winery. Use this before add_wine when the winery does not yet exist.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the winery' },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code, e.g. "FR", "IT", "CH" (optional)',
            },
          },
          required: ['name'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'add_wine') {
    if (!args || typeof args !== 'object' || !('name' in args)) {
      throw new Error('Invalid arguments: name is required');
    }
    const result = await addWineTool(client, args as unknown as AddWineParams);
    return { content: [{ type: 'text', text: result }] };
  }

  if (name === 'list_wines') {
    const result = await listWinesTool(client);
    return { content: [{ type: 'text', text: result }] };
  }

  if (name === 'get_wine') {
    if (!args || typeof args !== 'object' || !('wine_id' in args)) {
      throw new Error('Invalid arguments: wine_id is required');
    }
    const { wine_id } = args as { wine_id: string };
    const result = await getWineTool(client, wine_id);
    return { content: [{ type: 'text', text: result }] };
  }

  if (name === 'list_wineries') {
    const result = await listWineriesTool(client);
    return { content: [{ type: 'text', text: result }] };
  }

  if (name === 'get_winery') {
    if (!args || typeof args !== 'object' || !('winery_id' in args)) {
      throw new Error('Invalid arguments: winery_id is required');
    }
    const { winery_id } = args as { winery_id: string };
    const result = await getWineryTool(client, winery_id);
    return { content: [{ type: 'text', text: result }] };
  }

  if (name === 'add_winery') {
    if (!args || typeof args !== 'object' || !('name' in args)) {
      throw new Error('Invalid arguments: name is required');
    }
    const result = await addWineryTool(client, args as unknown as AddWineryParams);
    return { content: [{ type: 'text', text: result }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Celly MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
