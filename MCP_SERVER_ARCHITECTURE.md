# MCP Server Architecture for Celly

**Document Version:** 1.0
**Date:** 2026-01-17
**Status:** Design Proposal

## Executive Summary

This document outlines the architecture for integrating a **Model Context Protocol (MCP) Server** into Celly, enabling AI assistants (like Claude Desktop) to interact with the wine cellar management application through natural language.

### Key Benefits

- **Natural Language Interface**: Users can manage their wine collection through conversational AI
- **Hands-free Operations**: Add wines, tasting notes, and stock movements during tastings
- **AI-Powered Insights**: Leverage existing Claude API integrations for food pairings and enrichment
- **Secure & Type-Safe**: Reuses existing authentication, RLS, and TypeScript types

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
│       Supabase Edge Functions (Existing)        │
│  - mcp-server-proxy (new)                       │
│  - claude-proxy (existing)                      │
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
- ✅ Reuses existing business logic (hooks, validators)
- ✅ RLS security remains intact
- ✅ No direct database access from MCP server
- ✅ Supports user-specific Claude API keys (from `user_settings`)
- ✅ Consistent error handling and observability (Sentry)
- ✅ Easy to maintain and extend

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

Resources provide contextual data to the AI assistant.

### 2.1 Wine Collection Resources

| Resource URI | Description | Returns |
|-------------|-------------|---------|
| `wines://collection` | All wines in user's collection | Array of wines with full details |
| `wines://wine/{id}` | Single wine details | Wine with tasting notes, location, stock movements |
| `wines://ready-to-drink` | Wines in current drinking window | Filtered wines (drink_window_start <= current_year <= drink_window_end) |
| `wines://search?query={query}` | Search wines | Wines matching name, winery, or grapes |

### 2.2 Winery Resources

| Resource URI | Description | Returns |
|-------------|-------------|---------|
| `wineries://list` | All wineries | Array of wineries with wine counts |
| `wineries://winery/{id}/wines` | Wines from specific winery | Winery details + associated wines |

### 2.3 Statistics Resources

| Resource URI | Description | Returns |
|-------------|-------------|---------|
| `stats://dashboard` | Aggregated collection stats | Total bottles, total value, wines by country, etc. |

### 2.4 Cellar Resources

| Resource URI | Description | Returns |
|-------------|-------------|---------|
| `cellars://locations` | All cellar locations | Cellars with occupancy and wine locations |

---

## 3. MCP Tools (Write Operations)

Tools allow the AI to perform actions on behalf of the user.

### 3.1 Wine Management Tools

#### `add_wine`

Add a new wine to the collection.

**Input Schema:**
```typescript
{
  name: string                    // Required: Wine name
  winery_name?: string            // Optional: Winery name (auto-matched or created)
  grapes?: string[]               // Optional: Grape varieties
  vintage?: number                // Optional: Year (1800-2030)
  quantity: number                // Required: Initial stock quantity
  price?: number                  // Optional: Price per bottle (CHF)
  drink_window_start?: number     // Optional: Drinking window start year
  drink_window_end?: number       // Optional: Drinking window end year
  bottle_size?: string            // Optional: e.g., "750ml", "1.5L"
  food_pairings?: string          // Optional: Comma-separated pairings
}
```

**Example:**
```json
{
  "name": "Barolo Riserva",
  "winery_name": "Marchesi di Barolo",
  "grapes": ["Nebbiolo"],
  "vintage": 2015,
  "quantity": 6,
  "price": 85.50,
  "drink_window_start": 2025,
  "drink_window_end": 2035
}
```

#### `update_wine`

Update an existing wine.

**Input Schema:**
```typescript
{
  id: string                      // Required: Wine ID
  name?: string
  winery_id?: string
  grapes?: string[]
  vintage?: number
  quantity?: number
  price?: number
  drink_window_start?: number
  drink_window_end?: number
  bottle_size?: string
  food_pairings?: string
}
```

#### `delete_wine`

Delete a wine from the collection.

**Input Schema:**
```typescript
{
  id: string                      // Required: Wine ID
}
```

### 3.2 Tasting Note Tools

#### `add_tasting_note`

Add a tasting note with rating.

**Input Schema:**
```typescript
{
  wine_id: string                 // Required: Wine ID
  rating: number                  // Required: 1-5 stars
  notes: string                   // Required: Tasting notes
  tasted_at?: string              // Optional: ISO date (defaults to today)
}
```

**Example:**
```json
{
  "wine_id": "abc123",
  "rating": 4,
  "notes": "Complex bouquet with notes of cherry, leather, and tobacco. Well-balanced tannins.",
  "tasted_at": "2026-01-17"
}
```

### 3.3 Stock Management Tools

#### `add_stock_movement`

Add stock movement (in/out) with automatic quantity updates.

**Input Schema:**
```typescript
{
  wine_id: string                 // Required: Wine ID
  movement_type: "in" | "out"     // Required: Movement type
  quantity: number                // Required: Quantity (positive integer)
  notes?: string                  // Optional: Movement notes
  movement_date?: string          // Optional: ISO date (defaults to today)
}
```

**Example:**
```json
{
  "wine_id": "abc123",
  "movement_type": "out",
  "quantity": 2,
  "notes": "Consumed at dinner party",
  "movement_date": "2026-01-17"
}
```

### 3.4 Location Management Tools

#### `update_wine_location`

Update wine's physical location in cellar.

**Input Schema:**
```typescript
{
  wine_id: string                 // Required: Wine ID
  cellar_id: string               // Required: Cellar ID
  shelf?: number                  // Optional: Shelf number
  row?: number                    // Optional: Row number
  column?: number                 // Optional: Column number
}
```

### 3.5 AI-Powered Tools

#### `enrich_wine`

Auto-fill missing wine data using AI (reuses existing `wine-enrichment` from claude-proxy).

**Input Schema:**
```typescript
{
  wine_id: string                 // Required: Wine ID to enrich
}
```

**Behavior:**
- Fetches existing wine data
- Calls Claude API to fill missing fields (grapes, vintage, drinking window, winery, price, food pairings)
- Auto-matches or creates winery
- Returns confidence levels: "high" | "medium" | "low"

#### `find_food_pairing`

Get AI-powered food pairing recommendations (reuses existing `food-pairing` from claude-proxy).

**Input Schema:**
```typescript
{
  menu: string                    // Required: Menu or dish description
  wine_ids?: string[]             // Optional: Limit to specific wines (defaults to all)
  language?: "en" | "de-CH"       // Optional: Response language (defaults to user setting)
}
```

**Returns:**
```typescript
{
  recommendations: [
    {
      wine_id: string
      wine_name: string
      pairing_score: number       // 1-100
      explanation: string
    }
  ]
}
```

**Example:**
```json
{
  "menu": "Rindsfilet mit Trüffelsauce und Kartoffelgratin",
  "language": "de-CH"
}
```

#### `identify_wine_from_description`

**NEW TOOL** - Identify and potentially create wine from natural language description.

**Input Schema:**
```typescript
{
  description: string             // Required: Free-text wine description
  auto_create?: boolean           // Optional: Auto-create if confident (default: false)
}
```

**Example:**
```json
{
  "description": "I just bought a 2019 Château Margaux, Premier Grand Cru Classé, 6 bottles at CHF 450 each",
  "auto_create": true
}
```

**Behavior:**
1. Parses description using Claude API
2. Extracts: name, winery, vintage, quantity, price, region
3. Auto-matches existing winery or creates new one
4. If `auto_create: true` and confidence is high, creates wine record
5. Returns parsed data + wine_id if created

---

## 4. Implementation Plan

### Phase 1: Foundation (MVP) - Week 1

**Deliverables:**
1. ✅ MCP Server package setup (`/mcp-server/`)
   - TypeScript project with shared types from frontend
   - Depends on `@modelcontextprotocol/sdk`
   - Configuration for stdio transport

2. ✅ New Edge Function: `mcp-server-proxy`
   - Route incoming MCP tool calls to appropriate Supabase queries
   - JWT authentication middleware
   - User API key support (from `user_settings`)

3. ✅ Core Tools (3-5 tools)
   - `list_wines()` - Resource handler
   - `get_wine(id)` - Resource handler
   - `add_wine(data)` - Tool handler
   - `add_tasting_note(data)` - Tool handler

4. ✅ Documentation
   - Setup instructions for Claude Desktop
   - MCP server configuration file
   - Testing guide

### Phase 2: AI Integration - Week 2

**Deliverables:**
5. ✅ AI-Powered Tools
   - `find_food_pairing()` - Proxy to existing `claude-proxy`
   - `enrich_wine()` - Proxy to existing `claude-proxy`
   - `identify_wine_from_description()` - New Claude API integration

6. ✅ Error Handling & Observability
   - Sentry instrumentation
   - Error normalization
   - User-friendly error messages

### Phase 3: Advanced Features - Week 3

**Deliverables:**
7. ✅ Stock & Location Management
   - `add_stock_movement()`
   - `update_wine_location()`
   - Cellar resources

8. ✅ Smart Search & Filtering
   - Enhanced search with fuzzy matching
   - Complex queries (e.g., "wines under CHF 50 ready to drink")

9. ✅ Bulk Operations
   - `bulk_enrich_wines()` with progress reporting
   - `bulk_update_locations()`

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
│   ├── auth.ts               # JWT validation
│   ├── client.ts             # HTTP client for Edge Function calls
│   ├── tools/
│   │   ├── wines.ts          # Wine management tools
│   │   ├── tastingNotes.ts   # Tasting note tools
│   │   ├── stock.ts          # Stock movement tools
│   │   ├── ai.ts             # AI-powered tools
│   │   └── index.ts          # Tool registry
│   ├── resources/
│   │   ├── wines.ts          # Wine resources
│   │   ├── wineries.ts       # Winery resources
│   │   ├── stats.ts          # Statistics resources
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
  tool: string                    // Tool name (e.g., "add_wine")
  args: Record<string, unknown>   // Tool-specific arguments
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
    case 'add_wine':
      return handleAddWine(supabaseClient, user.id, args)
    case 'add_tasting_note':
      return handleAddTastingNote(supabaseClient, user.id, args)
    // ... more handlers
    default:
      return new Response(JSON.stringify({ error: 'Unknown tool' }), { status: 400 })
  }
})

async function handleListWines(client, userId, args) {
  const { data, error } = await client
    .from('wines')
    .select('*, wineries(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

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

### Scenario 1: Add Wine During Tasting

**User:** "I just bought a 2019 Château Margaux, 6 bottles for CHF 450 each"

**AI Assistant:**
1. Calls `add_wine()` tool
2. Auto-matches winery "Château Margaux" to existing record (or creates new)
3. Adds wine with quantity=6, price=450

**Response:** ✓ Added 2019 Château Margaux (6 bottles @ CHF 450/bottle)

---

### Scenario 2: Food Pairing for Dinner

**User:** "I'm cooking beef tenderloin with truffle sauce tonight. What pairs well from my collection?"

**AI Assistant:**
1. Calls `find_food_pairing()` with menu description
2. Claude API analyzes available wines
3. Returns top 3 recommendations with scores

**Response:**
```
Top Pairings:
1. 2015 Barolo Riserva (95/100)
   → Bold tannins complement the beef, earthy notes match truffle

2. 2018 Châteauneuf-du-Pape (88/100)
   → Rich, full-bodied with earthy complexity

3. 2016 Brunello di Montalcino (85/100)
   → Structured wine with good acidity to cut through richness
```

---

### Scenario 3: Inventory Check

**User:** "What wines should I drink in the next 2 years?"

**AI Assistant:**
1. Calls `wines://ready-to-drink` resource
2. Filters by drinking window (current_year <= drink_window_end <= current_year + 2)

**Response:**
```
8 wines are in their optimal drinking window:

1. 2012 Brunello di Montalcino (2020-2026)
   Location: Cellar A, Shelf 3, Row 2
   Quantity: 3 bottles

2. 2015 Pomerol (2022-2027)
   Location: Cellar A, Shelf 1, Row 5
   Quantity: 6 bottles

...
```

---

### Scenario 4: Tasting Note Entry

**User:** "I just tasted the 2015 Barolo. 4 stars. Complex bouquet with cherry, leather, tobacco. Well-balanced tannins, long finish."

**AI Assistant:**
1. Searches for "2015 Barolo" in collection
2. Calls `add_tasting_note()` with extracted rating and notes
3. Associates with wine ID

**Response:** ✓ Tasting note added for 2015 Barolo Riserva (4/5 stars)

---

### Scenario 5: Stock Movement

**User:** "We drank 2 bottles of the Châteauneuf-du-Pape at dinner last night"

**AI Assistant:**
1. Searches for Châteauneuf-du-Pape
2. Calls `add_stock_movement()` with type="out", quantity=2, movement_date="2026-01-16"
3. Database trigger automatically decrements wine quantity

**Response:** ✓ Removed 2 bottles of 2018 Châteauneuf-du-Pape (4 remaining)

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

### 10.1 Advanced AI Features

- **Image Recognition:** Upload wine label photo, auto-identify and create entry
- **Natural Language Queries:** "Show me all Bordeaux under CHF 100 ready to drink"
- **Personalized Recommendations:** Learn user preferences from tasting notes
- **Inventory Alerts:** Notify when wines enter optimal drinking window

### 10.2 Multi-User Support (Optional)

- **Shared Collections:** Multiple users access same cellar
- **Permissions:** Owner, viewer, contributor roles
- **Activity Log:** Track who added/modified wines

### 10.3 Import/Export

- **CSV Import:** Bulk wine import via MCP tool
- **PDF Export:** Generate cellar inventory reports
- **Integration:** Connect with wine retailers for auto-import

### 10.4 Analytics

- **Spending Insights:** Track wine budget over time
- **Drinking Patterns:** Most consumed regions, varieties
- **Value Tracking:** Monitor collection value appreciation

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

**Wine Enrichment Handler:**

```typescript
async function handleEnrichWine(client, userId, args) {
  const { wine_id } = args

  // 1. Fetch wine data
  const { data: wine, error: fetchError } = await client
    .from('wines')
    .select('*, wineries(*)')
    .eq('id', wine_id)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    return errorResponse(fetchError.message, 404)
  }

  // 2. Call existing claude-proxy for enrichment
  const enrichmentResponse = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'wine-enrichment',
      wineName: wine.name,
      vintage: wine.vintage,
    }),
  })

  const enrichmentData = await enrichmentResponse.json()

  // 3. Update wine with enriched data
  const updates = {}
  if (!wine.grapes && enrichmentData.grapes) {
    updates.grapes = enrichmentData.grapes
  }
  // ... more field updates

  const { data: updatedWine, error: updateError } = await client
    .from('wines')
    .update(updates)
    .eq('id', wine_id)
    .eq('user_id', userId)
    .select()
    .single()

  if (updateError) {
    return errorResponse(updateError.message, 500)
  }

  return successResponse({
    wine: updatedWine,
    enriched_fields: Object.keys(updates),
    confidence: enrichmentData.confidence,
  })
}
```

---

## Appendix C: Tool Definition Examples

**Add Wine Tool Definition:**

```typescript
export const addWineTool = {
  name: 'add_wine',
  description: 'Add a new wine to the collection. Automatically matches or creates winery.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Wine name (e.g., "Barolo Riserva")',
      },
      winery_name: {
        type: 'string',
        description: 'Winery name (will auto-match existing or create new)',
      },
      grapes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Grape varieties (e.g., ["Nebbiolo", "Barbera"])',
      },
      vintage: {
        type: 'number',
        description: 'Vintage year (1800-2030)',
        minimum: 1800,
        maximum: 2030,
      },
      quantity: {
        type: 'number',
        description: 'Initial stock quantity',
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
      },
      drink_window_end: {
        type: 'number',
        description: 'Drinking window end year',
      },
      bottle_size: {
        type: 'string',
        description: 'Bottle size (e.g., "750ml", "1.5L", "3L")',
      },
    },
    required: ['name', 'quantity'],
  },
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-17 | Solution Architect | Initial architecture design |

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Anthropic Claude API Documentation](https://docs.anthropic.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Celly CLAUDE.md](./CLAUDE.md) - Project documentation
- [Celly Database Schema](./src/types/database.ts) - Type definitions
