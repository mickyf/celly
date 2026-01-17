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
import { getWineCollectionResource, getWineDetailResource } from './resources.js';
import { addWineTool, listWinesTool, getWineTool } from './tools.js';
import type { AddWineParams } from './types.js';

// Load configuration
const config = loadConfig();
const client = new SupabaseClient(config);

// Create MCP server
const server = new Server(
  {
    name: 'celly-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'celly://wines',
        name: 'Wine Collection',
        description: 'Your complete wine collection with drinking status',
        mimeType: 'text/markdown',
      },
    ],
  };
});

/**
 * Read a resource
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === 'celly://wines') {
    const content = await getWineCollectionResource(client);
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  }

  // Handle individual wine resources: celly://wines/{id}
  if (uri.startsWith('celly://wines/')) {
    const id = uri.replace('celly://wines/', '');
    const content = await getWineDetailResource(client, id);
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

/**
 * List available tools
 */
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
            wine_id: {
              type: 'string',
              description: 'ID of the wine to retrieve',
            },
          },
          required: ['wine_id'],
        },
      },
      {
        name: 'add_wine',
        description: 'Add a new wine to the collection',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the wine',
            },
            vintage: {
              type: 'number',
              description: 'Vintage year (optional)',
            },
            grapes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Grape varieties (optional)',
            },
            quantity: {
              type: 'number',
              description: 'Number of bottles (default: 1)',
            },
            drink_from: {
              type: 'number',
              description: 'Start of drinking window year (optional)',
            },
            drink_until: {
              type: 'number',
              description: 'End of drinking window year (optional)',
            },
            price: {
              type: 'number',
              description: 'Price in CHF (optional)',
            },
            bottle_size: {
              type: 'number',
              description: 'Bottle size in ml (default: 750)',
            },
            food_pairings: {
              type: 'string',
              description: 'Food pairing suggestions (optional)',
            },
            winery_id: {
              type: 'string',
              description: 'ID of the winery (optional)',
            },
          },
          required: ['name'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'add_wine') {
    // Validate that args contains required fields
    if (!args || typeof args !== 'object' || !('name' in args)) {
      throw new Error('Invalid arguments: name is required');
    }

    const params = args as unknown as AddWineParams;
    const result = await addWineTool(client, params);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  if (name === 'list_wines') {
    const result = await listWinesTool(client);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  if (name === 'get_wine') {
    if (!args || typeof args !== 'object' || !('wine_id' in args)) {
      throw new Error('Invalid arguments: wine_id is required');
    }

    const { wine_id } = args as { wine_id: string };
    const result = await getWineTool(client, wine_id);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Celly MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
