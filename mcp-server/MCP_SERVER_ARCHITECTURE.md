# MCP Server Architecture for Celly

**Document Version:** 1.1
**Date:** 2026-01-17
**Status:** Design Proposal - Minimal MVP Scope

## Executive Summary

This document outlines the architecture for integrating a **Model Context Protocol (MCP) Server** into Celly, enabling AI assistants (like Claude Desktop) to interact with the wine cellar management application through natural language.

### Key Benefits

- **Natural Language Interface**: Users can manage their wine collection through conversational AI
- **Hands-free Operations**: Add wines and query collection during tastings
- **Secure & Type-Safe**: Reuses existing authentication, RLS, and TypeScript types
- **Extensible Foundation**: Initial MVP focuses on core operations with clear path for future enhancements

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────┐
│   Claude Desktop / AI Assistant (MCP Client)    │
└───────────────┬─────────────────────────────────┘
                │
                │ MCP Protocol (stdio/SSE)
                │
┌───────────────▼─────────────────────────────────┐
│          MCP Server (Node.js/TypeScript)        │
│  - Authentication Middleware (JWT validation)   │
│  - Tool/Resource Handlers                       │
│  - Type Safety (shares types with frontend)     │
└───────────────┬─────────────────────────────────┘
                │
                │ HTTP/REST calls
                │
┌───────────────▼─────────────────────────────────┐
│       Supabase Edge Functions                   │
│  - mcp-server-proxy (new)                       │
└───────────────┬─────────────────────────────────┘
                │
                │ Supabase Client SDK
                │
┌───────────────▼─────────────────────────────────┐
│          Supabase PostgreSQL + RLS              │
│  - wines, wineries, tasting_notes, etc.         │
└─────────────────────────────────────────────────┘
```

### 1.2 Architecture Decision: Gateway Pattern (Recommended)

**Option A: MCP Server → Edge Function Gateway** ✅ **RECOMMENDED**

**Advantages:**
- ✅ RLS security remains intact
- ✅ No direct database access from MCP server
- ✅ Consistent error handling
- ✅ Easy to maintain and extend
- ✅ Can leverage existing Edge Functions for future AI features

**Trade-offs:**
- ⚠️ Extra HTTP hop (minimal latency ~50-100ms)

**Option B: MCP Server → Direct Supabase** ❌ Not Recommended

**Advantages:**
- ✅ Faster (no extra hop)

**Disadvantages:**
- ⚠️ Duplicates business logic
- ⚠️ RLS must be handled in MCP server
- ⚠️ Harder to maintain consistency
- ⚠️ Cannot reuse existing AI integrations easily

---

## 2. MCP Resources (Read-Only Data)

Resources provide contextual data to the AI assistant. This minimal implementation focuses on core wine collection access.

### 2.1 Wine Collection Resources

| Resource URI | Description | Returns |
|-------------|-------------|---------|
| `wines://collection` | All wines in user's collection | Array of wines with full details (name, winery, grapes, vintage, quantity, price, drinking window, bottle size, food pairings, photo URL) |
| `wines://wine/{id}` | Single wine details | Single wine with related data (tasting notes, wine locations, stock movements) |

**Notes:**
- Both resources respect Row Level Security (RLS) - only return data for authenticated user
- Resources can optionally accept parameters (e.g., `winery_id` filter for collection)
- Claude Desktop AI can use these resources to answer queries about the wine collection

---

## 3. MCP Tools (Write Operations)

Tools allow the AI to perform actions on behalf of the user. This minimal implementation focuses on the single most essential write operation.

### 3.1 Wine Management Tools

#### `add_wine`

Add a new wine to the collection. This is the only write operation in the MVP implementation.

**Input Schema:**
```typescript
{
  name: string                    // Required: Wine name
  winery_id?: string              // Optional: Winery ID (must exist in database)
  grapes?: string[]               // Optional: Grape varieties
  vintage?: number                // Optional: Year (1900-2035)
  quantity?: number               // Optional: Initial stock quantity (defaults to 1, minimum 1)
  price?: number                  // Optional: Price per bottle (CHF, minimum 0)
  drink_window_start?: number     // Optional: Drinking window start year (minimum 1900)
  drink_window_end?: number       // Optional: Drinking window end year (must be >= start)
  bottle_size?: string            // Optional: e.g., "75cl", "150cl", "37.5cl"
  food_pairings?: string          // Optional: Free-text food pairings description
  photo_url?: string              // Optional: URL to wine photo in Supabase Storage
}
```

**Validation:**
- `name`: Required, must be non-empty after trim
- `vintage`: If provided, must be 1900-2035
- `quantity`: If provided, must be >= 1 (defaults to 1 if not specified)
- `price`: If provided, must be >= 0
- `drink_window_start`: If provided, must be >= 1900
- `drink_window_end`: If provided, must be >= drink_window_start
- `winery_id`: If provided, must reference an existing winery (foreign key constraint)

**Returns:**
```typescript
{
  id: string                      // Generated UUID
  user_id: string                 // Auto-populated from JWT token
  name: string
  winery_id: string | null
  grapes: string[]                // Defaults to empty array
  vintage: number | null
  quantity: number                // Defaults to 1
  price: number | null
  drink_window_start: number | null
  drink_window_end: number | null
  bottle_size: string | null
  food_pairings: string | null
  photo_url: string | null
  created_at: string              // ISO timestamp
  updated_at: string              // ISO timestamp
}
```

**Example:**
```json
{
  "name": "Barolo Riserva",
  "winery_id": "abc-123-winery-id",
  "grapes": ["Nebbiolo"],
  "vintage": 2015,
  "quantity": 6,
  "price": 85.50,
  "drink_window_start": 2025,
  "drink_window_end": 2035,
  "bottle_size": "75cl",
  "food_pairings": "Red meat, aged cheeses, truffle dishes"
}
```

**Notes:**
- Only the wine name is required - all other fields are optional
- The tool automatically populates `user_id` from the authenticated JWT token
- Wine is created with RLS policies ensuring the user can only see their own wines
- The AI assistant can parse natural language descriptions (e.g., "I bought a 2019 Château Margaux") and extract the appropriate fields

---

## 4. Implementation Plan

### Phase 1: Foundation (MVP) - Initial Implementation

This minimal implementation focuses on core functionality with a clear path for future enhancements.

**Deliverables:**

1. **MCP Server Package Setup** (`/mcp-server/`)
   - TypeScript project with shared types from frontend
   - Depends on `@modelcontextprotocol/sdk`
   - Configuration for stdio transport
   - Auth middleware for JWT validation

2. **New Edge Function: `mcp-server-proxy`**
   - Route incoming MCP requests to Supabase database
   - JWT authentication middleware
   - Handle three operations:
     - `add_wine` - Insert wine with user_id from JWT
     - `list_wines` - Query wines with optional winery filter (via resource read)
     - `get_wine` - Query single wine by ID (via resource read)
   - Input validation for all operations
   - Error handling with descriptive messages

3. **Core Implementation**
   - **Resources:**
     - `wines://collection` - Fetch all wines for authenticated user (with optional winery_id filter)
     - `wines://wine/{id}` - Fetch single wine with relations (tasting_notes, wine_locations, stock_movements)
   - **Tools:**
     - `add_wine(data)` - Create new wine with validation

4. **Documentation**
   - Setup instructions for Claude Desktop
   - MCP server configuration file example
   - Testing guide with example prompts
   - Clear roadmap for future enhancements

### Future Phases

The initial MVP provides a foundation for incremental feature additions:

**Phase 2: Additional Write Operations**
- `update_wine` - Modify existing wine details
- `delete_wine` - Remove wine from collection
- `add_tasting_note` - Add rating and notes after tasting

**Phase 3: Stock & Location Management**
- `add_stock_movement` - Track bottles in/out
- `update_wine_location` - Organize wines in cellars
- Cellar resources for location management

**Phase 4: AI Integration**
- `enrich_wine` - Auto-fill missing data using Claude API
- `find_food_pairing` - AI-powered pairing recommendations
- `identify_wine_from_description` - Parse natural language wine descriptions
- Image recognition for wine labels

**Phase 5: Advanced Features**
- Search and filtering resources (ready-to-drink, price ranges, etc.)
- Winery resources and management
- Statistics and analytics resources
- Bulk operations with progress tracking

---

## 5. Technical Implementation Details

### 5.1 MCP Server Structure

**Directory Layout:**
```
/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Configuration (env vars, URLs)
│   ├── auth.ts               # JWT validation (future - currently handled by Edge Function)
│   ├── client.ts             # HTTP client for Edge Function calls
│   ├── tools/
│   │   ├── wines.ts          # Wine management tools (add_wine only)
│   │   └── index.ts          # Tool registry
│   ├── resources/
│   │   ├── wines.ts          # Wine resources (collection, single wine)
│   │   └── index.ts          # Resource registry
│   └── types/
│       └── index.ts          # Shared types (symlink to frontend)
└── README.md
```

### 5.2 Edge Function: `mcp-server-proxy`

**Purpose:** Gateway between MCP Server and Supabase database.

**Request Schema:**
```typescript
{
  tool: "add_wine" | "list_wines" | "get_wine"  // Tool/resource name
  args: Record<string, unknown>                  // Operation-specific arguments
}
```

**Response Schema:**
```typescript
{
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
  }
}
```

**Implementation Pattern:**
```typescript
// supabase/functions/mcp-server-proxy/index.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/types/database.ts'

Deno.serve(async (req) => {
  // 1. Validate JWT token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // 2. Extract user from token
  const supabaseClient = createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
  }

  // 3. Parse request
  const { tool, args } = await req.json()

  // 4. Route to appropriate handler
  switch (tool) {
    case 'list_wines':
      return handleListWines(supabaseClient, user.id, args)
    case 'get_wine':
      return handleGetWine(supabaseClient, user.id, args)
    case 'add_wine':
      return handleAddWine(supabaseClient, user.id, args)
    default:
      return new Response(JSON.stringify({ error: 'Unknown tool' }), { status: 400 })
  }
})

async function handleListWines(client, userId, args) {
  const { winery_id } = args

  let query = client
    .from('wines')
    .select('*, wineries(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Optional filter by winery
  if (winery_id) {
    query = query.eq('winery_id', winery_id)
  }

  const { data, error } = await query

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, data }), { status: 200 })
}

async function handleGetWine(client, userId, args) {
  const { id } = args

  if (!id) {
    return new Response(JSON.stringify({ error: 'Wine ID required' }), { status: 400 })
  }

  const { data, error } = await client
    .from('wines')
    .select(`
      *,
      wineries(*),
      tasting_notes(*),
      wine_locations(*, cellars(*)),
      stock_movements(*)
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 404 })
  }

  return new Response(JSON.stringify({ success: true, data }), { status: 200 })
}

async function handleAddWine(client, userId, args) {
  // Validate required fields
  if (!args.name || typeof args.name !== 'string' || args.name.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'Wine name is required' }),
      { status: 400 }
    )
  }

  // Validate numeric fields
  if (args.vintage !== undefined && (args.vintage < 1900 || args.vintage > 2035)) {
    return new Response(
      JSON.stringify({ error: 'Vintage must be between 1900 and 2035' }),
      { status: 400 }
    )
  }

  if (args.quantity !== undefined && args.quantity < 1) {
    return new Response(
      JSON.stringify({ error: 'Quantity must be at least 1' }),
      { status: 400 }
    )
  }

  if (args.price !== undefined && args.price < 0) {
    return new Response(
      JSON.stringify({ error: 'Price cannot be negative' }),
      { status: 400 }
    )
  }

  if (args.drink_window_start !== undefined && args.drink_window_start < 1900) {
    return new Response(
      JSON.stringify({ error: 'Drink window start must be >= 1900' }),
      { status: 400 }
    )
  }

  if (
    args.drink_window_end !== undefined &&
    args.drink_window_start !== undefined &&
    args.drink_window_end < args.drink_window_start
  ) {
    return new Response(
      JSON.stringify({ error: 'Drink window end must be >= start' }),
      { status: 400 }
    )
  }

  // Build wine insert object
  const wineData = {
    user_id: userId,
    name: args.name.trim(),
    winery_id: args.winery_id || null,
    grapes: args.grapes || [],
    vintage: args.vintage || null,
    quantity: args.quantity !== undefined ? args.quantity : 1,
    price: args.price || null,
    drink_window_start: args.drink_window_start || null,
    drink_window_end: args.drink_window_end || null,
    bottle_size: args.bottle_size || null,
    food_pairings: args.food_pairings || null,
    photo_url: args.photo_url || null,
  }

  const { data, error } = await client
    .from('wines')
    .insert(wineData)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, data }), { status: 200 })
}
```

### 5.3 MCP Server Code Example

```typescript
// mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { config } from './config.js'
import { validateToken } from './auth.js'
import { callEdgeFunction } from './client.js'
import { tools } from './tools/index.js'
import { resources } from './resources/index.js'

const server = new Server(
  {
    name: 'celly-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
}))

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: resources.map(resource => ({
    uri: resource.uri,
    name: resource.name,
    description: resource.description,
    mimeType: 'application/json',
  })),
}))

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    // Call edge function via HTTP
    const response = await callEdgeFunction('mcp-server-proxy', {
      tool: name,
      args,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    }
  }
})

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  // Parse URI (e.g., "wines://collection")
  const [scheme, path] = uri.split('://')

  const resource = resources.find(r => r.uri === uri)
  if (!resource) {
    throw new Error(`Unknown resource: ${uri}`)
  }

  const data = await resource.read()

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Celly MCP Server running on stdio')
}

main()
```

### 5.4 Authentication Flow

```
1. User configures MCP server in Claude Desktop with API token
2. MCP client passes token in requests
3. MCP server includes token in Authorization header to Edge Function
4. Edge Function validates JWT via supabase.auth.getUser()
5. Edge Function extracts user_id and queries database with RLS
6. Response flows back through chain
```

**Token Management:**
- User obtains token via Supabase Auth (login)
- Token stored in MCP server config (`.env` or Claude Desktop settings)
- Token refreshed automatically by Supabase client library
- Expired tokens return 401, triggering re-authentication

### 5.5 Type Safety

**Shared Types Strategy:**
- Frontend uses auto-generated `src/types/database.ts`
- MCP server symlinks to same file: `mcp-server/src/types/database.ts -> ../../../src/types/database.ts`
- Edge function imports from same source
- **Benefits:** Single source of truth, compile-time safety, auto-updates on schema changes

---

## 6. User Experience Scenarios

These scenarios demonstrate how the minimal MVP provides core functionality while laying the groundwork for future enhancements.

### Scenario 1: Add Wine During Tasting

**User:** "I just bought a 2019 Château Margaux, 6 bottles for CHF 450 each"

**AI Assistant:**
1. Parses the description to extract: name, vintage, quantity, price
2. Calls `add_wine()` tool with extracted data
3. Returns confirmation with created wine details

**Response:** ✓ Added 2019 Château Margaux (6 bottles @ CHF 450/bottle)

**Note:** In future phases, AI can auto-match or create wineries. For MVP, the winery_id field would be null unless the user has already created the winery.

---

### Scenario 2: Inventory Check

**User:** "Show me all the wines in my collection"

**AI Assistant:**
1. Calls `wines://collection` resource
2. Returns formatted list with key details

**Response:**
```
You have 24 wines in your collection:

1. 2019 Château Margaux (6 bottles, CHF 450/bottle)
   Grapes: Cabernet Sauvignon, Merlot
   Drinking window: 2025-2040

2. 2015 Barolo Riserva (3 bottles, CHF 85.50/bottle)
   Grapes: Nebbiolo
   Drinking window: 2025-2035

3. 2018 Châteauneuf-du-Pape (4 bottles, CHF 65/bottle)
   Grapes: Grenache, Syrah, Mourvèdre
   Drinking window: 2023-2030

...
```

---

### Scenario 3: Wine Details

**User:** "Tell me more about the Barolo in my collection"

**AI Assistant:**
1. Searches collection for "Barolo" (using `wines://collection` resource)
2. Calls `wines://wine/{id}` resource for matching wine
3. Returns detailed information including tasting notes, locations, stock history

**Response:**
```
2015 Barolo Riserva

Details:
- Quantity: 3 bottles
- Price: CHF 85.50/bottle
- Grapes: Nebbiolo
- Drinking window: 2025-2035
- Bottle size: 75cl
- Food pairings: Red meat, aged cheeses, truffle dishes

Locations:
- Cellar A, Shelf 3, Row 2: 3 bottles

Tasting Notes:
- 2026-01-15 (4/5 stars): Complex bouquet with notes of cherry, leather, and tobacco. Well-balanced tannins.

Stock History:
- 2025-12-01: Added 6 bottles (Purchase)
- 2026-01-15: Removed 2 bottles (Dinner party)
- Current: 3 bottles remaining
```

**Note:** The resource includes related data (tasting notes, locations, stock movements) even though the MVP doesn't provide tools to create them. This allows the AI to provide rich context from data entered via the web UI.

---

## 7. Security Considerations

### 7.1 Authentication & Authorization

- **JWT Validation:** Every request validates Bearer token via Supabase Auth
- **Row Level Security (RLS):** All database queries filtered by `user_id`
- **Token Expiry:** Tokens expire per Supabase configuration, requiring re-login
- **No Direct DB Access:** MCP server never connects directly to database

### 7.2 Rate Limiting

- **Edge Function Limits:** Supabase enforces per-project rate limits
- **Claude API Limits:** Bulk operations use 1-second delays (existing pattern)
- **MCP Server:** No built-in rate limiting (relies on Edge Function)

### 7.3 Data Validation

- **Input Validation:** All tool inputs validated against JSON schemas
- **Output Sanitization:** AI responses validated before database insertion
- **SQL Injection:** Prevented by Supabase parameterized queries
- **XSS:** Not applicable (no HTML rendering in MCP context)

### 7.4 API Key Storage

- **User API Keys:** Stored in `user_settings` table (encrypted by Supabase)
- **Server API Key:** Stored in Supabase secrets (not in MCP server)
- **Claude Desktop Config:** User token stored in local config file

---

## 8. Testing Strategy

### 8.1 Unit Tests

- **MCP Server:** Jest tests for tool/resource handlers
- **Edge Function:** Deno tests for request routing
- **Type Safety:** TypeScript compile-time checks

### 8.2 Integration Tests

- **End-to-End:** MCP client → Server → Edge Function → Database
- **Auth Flow:** Token validation, user context extraction
- **AI Calls:** Mock Claude API responses for deterministic testing

### 8.3 Manual Testing

- **Claude Desktop:** Interactive testing with real AI assistant
- **Test User:** Use seed data from `supabase/seed.sql`
- **Error Scenarios:** Invalid tokens, malformed inputs, network failures

---

## 9. Deployment

### 9.1 Local Development

**Prerequisites:**
- Supabase local instance running (`npx supabase start`)
- Frontend environment variables configured
- Claude API key in `supabase/.env`

**Steps:**
```bash
# 1. Deploy Edge Function
cd supabase
npx supabase functions deploy mcp-server-proxy --no-verify-jwt

# 2. Start MCP Server
cd ../mcp-server
npm install
npm run build
npm start

# 3. Configure Claude Desktop
# Add to claude_desktop_config.json:
{
  "mcpServers": {
    "celly": {
      "command": "node",
      "args": ["/path/to/celly/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "http://127.0.0.1:54321",
        "USER_TOKEN": "<your-jwt-token>"
      }
    }
  }
}

# 4. Restart Claude Desktop
```

### 9.2 Production Deployment

**Edge Function:**
```bash
npx supabase link --project-ref <your-project>
npx supabase functions deploy mcp-server-proxy --no-verify-jwt
```

**MCP Server:**
- Distribute as npm package or Docker image
- Users install locally and configure with their Supabase credentials
- Update Claude Desktop config with production URLs

---

## 10. Future Enhancements

The minimal MVP provides a solid foundation for incremental feature additions. Future phases can build on this foundation:

### 10.1 Additional Write Operations (Phase 2)

- **update_wine:** Modify existing wine details
- **delete_wine:** Remove wine from collection
- **add_tasting_note:** Add rating and notes after tasting

### 10.2 Stock & Location Management (Phase 3)

- **add_stock_movement:** Track bottles in/out with automatic quantity updates
- **update_wine_location:** Organize wines in cellars with shelf/row/column coordinates
- **Cellar resources:** Query cellar locations and occupancy

### 10.3 AI Integration (Phase 4)

- **enrich_wine:** Auto-fill missing data using Claude API (reuse existing `claude-proxy`)
- **find_food_pairing:** AI-powered pairing recommendations (reuse existing `claude-proxy`)
- **identify_wine_from_description:** Parse natural language wine descriptions
- **Image recognition:** Upload wine label photo, auto-identify and create entry

### 10.4 Advanced Features (Phase 5)

- **Search & filtering resources:** Ready-to-drink wines, price ranges, completeness filters
- **Winery resources:** Query wineries and associated wines
- **Statistics resources:** Dashboard stats (total bottles, value, countries, etc.)
- **Bulk operations:** Bulk enrichment with progress tracking
- **Natural language queries:** "Show me all Bordeaux under CHF 100 ready to drink"
- **Personalized recommendations:** Learn user preferences from tasting notes
- **Inventory alerts:** Notify when wines enter optimal drinking window

**Note:** Multi-user support and import/export are explicitly out of scope per project constraints documented in CLAUDE.md.

---

## 11. Success Metrics

### 11.1 Adoption Metrics

- % of wine entries created via MCP (vs. web UI)
- Daily active MCP users
- Average tools called per session

### 11.2 Performance Metrics

- MCP tool call latency (target: <2s)
- Edge Function response time (target: <500ms)
- AI enrichment accuracy (target: >90% high confidence)

### 11.3 User Satisfaction

- NPS score for MCP integration
- Support tickets related to MCP
- Feature requests for new tools

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Claude API Rate Limits** | High | Implement client-side rate limiting, show user feedback |
| **JWT Token Expiry** | Medium | Auto-refresh tokens, clear error messages |
| **Edge Function Cold Starts** | Low | Use Supabase Edge Function warm-up techniques |
| **Type Drift** | Medium | CI/CD checks for type consistency, shared types |
| **User Confusion** | Medium | Comprehensive documentation, examples, error messages |

---

## Appendix A: Example MCP Server Configuration

**Claude Desktop Config (`claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "celly": {
      "command": "node",
      "args": [
        "/Users/username/projects/celly/mcp-server/dist/index.js"
      ],
      "env": {
        "SUPABASE_URL": "http://127.0.0.1:54321",
        "USER_TOKEN": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

---

## Appendix B: Edge Function Handler Examples

The complete implementation of the three core handlers is shown in Section 5.2. For reference, here's the pattern for error handling and response formatting:

**Error Response Helper:**
```typescript
function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message,
        code: status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR'
      }
    }),
    { status }
  )
}
```

**Success Response Helper:**
```typescript
function successResponse(data: any) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200 }
  )
}
```

These helpers ensure consistent response formatting across all handlers, making it easier for the MCP server to parse and present results to the AI assistant.

---

## Appendix C: Tool Definition Examples

**Add Wine Tool Definition:**

```typescript
export const addWineTool = {
  name: 'add_wine',
  description: 'Add a new wine to the collection. Only the wine name is required; all other fields are optional.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Wine name (e.g., "Barolo Riserva")',
      },
      winery_id: {
        type: 'string',
        description: 'UUID of existing winery (optional)',
      },
      grapes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Grape varieties (e.g., ["Nebbiolo", "Barbera"])',
      },
      vintage: {
        type: 'number',
        description: 'Vintage year (1900-2035)',
        minimum: 1900,
        maximum: 2035,
      },
      quantity: {
        type: 'number',
        description: 'Initial stock quantity (defaults to 1)',
        minimum: 1,
      },
      price: {
        type: 'number',
        description: 'Price per bottle in CHF',
        minimum: 0,
      },
      drink_window_start: {
        type: 'number',
        description: 'Drinking window start year',
        minimum: 1900,
      },
      drink_window_end: {
        type: 'number',
        description: 'Drinking window end year (must be >= start)',
      },
      bottle_size: {
        type: 'string',
        description: 'Bottle size (e.g., "75cl", "150cl", "37.5cl")',
      },
      food_pairings: {
        type: 'string',
        description: 'Free-text description of food pairings',
      },
      photo_url: {
        type: 'string',
        description: 'URL to wine photo in Supabase Storage',
      },
    },
    required: ['name'],
  },
}
```

**Wine Collection Resource Definition:**

```typescript
export const wineCollectionResource = {
  uri: 'wines://collection',
  name: 'Wine Collection',
  description: 'All wines in the user\'s collection, with optional filtering by winery',
  mimeType: 'application/json',
}
```

**Wine Detail Resource Definition:**

```typescript
export const wineDetailResource = {
  uri: 'wines://wine/{id}',
  name: 'Wine Details',
  description: 'Detailed information about a specific wine, including tasting notes, locations, and stock movements',
  mimeType: 'application/json',
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-17 | Solution Architect | Initial architecture design |
| 1.1 | 2026-01-17 | Solution Architect | Updated to minimal MVP scope - focused on 3 core operations (add_wine tool, wines://collection and wines://wine/{id} resources) |

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Anthropic Claude API Documentation](https://docs.anthropic.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Celly CLAUDE.md](./CLAUDE.md) - Project documentation
- [Celly Database Schema](./src/types/database.ts) - Type definitions
