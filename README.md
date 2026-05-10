# Celly - Wine Cellar Management

A modern wine cellar management application that enables wine enthusiasts to track their collection, add tasting notes, and get AI-powered food pairing recommendations.

The app is currently hosted under: https://celly.pages.dev/

## Features

- **Wine Collection Management**: Track wines with detailed information including winery, grapes, vintage, quantity, price, bottle size, and drinking windows
- **Winery Database**: Track and organize wines by winery with country information
- **Cellar Locations**: Place wines in physical cellar slots (shelf, row, column) with seat-booking-style overview
- **Stock Inventory**: Track wine additions and removals with automatic quantity updates via DB triggers
- **Bottle Size Tracking**: Record bottle sizes (37.5cl through 600cl/Imperial) for each wine
- **Photo Storage**: Upload wine bottle photos or capture them directly with your device camera
- **Tasting Notes**: Add ratings (1-5 stars), notes, and dates for each wine
- **AI Data Enrichment**: Automatically fill in missing wine information (grapes, price, drinking window, food pairings, winery) using Claude Sonnet 4.5; works from a wine name, free-text input, or a bottle photo. Bulk enrichment for the whole cellar.
- **AI Food Pairing**: Get intelligent food pairing recommendations for meals based on wines in your collection, with a 5-minute pairing cache and history list
- **Bulk Import from Order Documents**: Upload a wine merchant's PDF or image and Claude extracts the wines into a review table; rows match against existing wines so re-orders become stock-in movements while new wines get created in one batch
- **Smart Filtering**: Search and filter by name, winery, grapes, vintage range, price range, and drinking window status with URL-based filter persistence
- **Dashboard Statistics**: Visual overview of collection with charts and key metrics
- **Internationalization**: Full support for English and Swiss German (de-CH) with Swiss-German as default
- **Swiss Localization**: CHF currency and Swiss date format (dd.MM.yyyy)
- **Drinking Window Tracking**: Know which wines are ready to drink, aging, or past their prime
- **PWA**: Installable as a standalone app on desktop and mobile, with offline-ready static assets
- **MCP Server Integration**: AI assistants like Claude Desktop can interact with your wine collection through natural language via the [Model Context Protocol](https://modelcontextprotocol.io)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: TanStack Router (file-based routing)
- **State Management**: TanStack Query for server state
- **UI Framework**: Mantine UI v8 with custom grape theme
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI Integration**: Anthropic Claude Sonnet 4.5 API
- **Internationalization**: react-i18next with English and German (Swiss) translations

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (the app is wired against the cloud project — no local Docker needed)
- Anthropic API key (get from [console.anthropic.com](https://console.anthropic.com)). End users can also bring their own key in Settings.

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd celly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Link to your Supabase project** (one-time)
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

4. **Configure environment variables**

   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local`:
   ```bash
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

   The Claude API key lives **server-side** as a Supabase secret (set via the dashboard or `npx supabase secrets set CLAUDE_API_KEY=…`); it is never exposed to the browser. All Claude calls are proxied through the `claude-proxy` Edge Function.

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:5173 and hits the cloud Supabase project for data and Edge Functions.

## Development Commands

```bash
# Development
npm run dev                 # Start Vite dev server (talks to cloud Supabase)

# Building
npm run build               # TypeScript compilation + Vite build
npm run build:sentry        # Build with the current commit hash as the Sentry release
npm run preview             # Preview production build

# Code Quality
npm run lint                # Run ESLint
npm test                    # Vitest single run
npm run test:watch          # Vitest watch mode

# Database (cloud)
npm run gen-types           # Generate TypeScript types from cloud schema (--linked)
npx supabase migration new <name>   # Scaffold a new migration file
npx supabase db push        # Apply pending migrations to the linked cloud project

# Edge Functions
npx supabase functions deploy <name> --no-verify-jwt
npx supabase secrets set CLAUDE_API_KEY=<key>
```

## Project Structure

```
celly/
├── src/
│   ├── routes/              # TanStack Router file-based routes
│   │   ├── __root.tsx       # App shell with layout
│   │   ├── index.tsx        # Dashboard
│   │   ├── login.tsx        # Authentication
│   │   ├── pairing.tsx      # AI food pairing
│   │   └── wines/           # Wine management routes
│   ├── components/          # Reusable React components
│   ├── hooks/              # Custom React hooks (TanStack Query)
│   ├── lib/                # Utilities (Supabase, Claude API)
│   ├── locales/            # i18n translations (en, de-CH)
│   ├── i18n/               # i18n configuration
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── migrations/         # Database schema migrations
│   ├── functions/          # Supabase Edge Functions
│   └── seed.sql           # Test data
├── mcp-server/             # Model Context Protocol server
│   ├── src/                # MCP server TypeScript source
│   └── README.md          # MCP server documentation
└── CLAUDE.md              # AI coding assistant guide
```

## Database Schema

- **wineries**: Winery information (name, ISO country code)
- **wines**: Core wine data — name, grapes[], vintage, quantity, price, bottle size, drinking window, food pairings, optional winery, optional `import_batch_id` for batch-import grouping
- **tasting_notes**: Ratings (1-5 stars), notes, and dates per wine
- **stock_movements**: Wine in/out movements; a DB trigger updates `wines.quantity` automatically. Carries `import_batch_id` so order-document imports can be filtered as a unit.
- **cellars**: Physical cellar locations (name)
- **wine_locations**: Slot-based mapping (cellar, shelf, row, column) with optional wine assignment
- **user_settings**: Per-user key/JSONB store (theme, BYO Claude API key, etc.)
- **wine-images**: Storage bucket for wine bottle photos (user-scoped folders)

All tables use Row Level Security (RLS) filtered by `auth.uid()`. See `supabase/migrations/` for the full schema history.

## Type Safety

The project uses auto-generated TypeScript types from the Supabase schema:

```bash
npm run gen-types  # Run after any database schema changes
```

This updates `src/types/database.ts` with exact table types.

## Internationalization

The app supports English and Swiss German:

- Translation files: `src/locales/{en,de-CH}/{namespace}.json`
- Language selector in app header
- Persistent language preference in localStorage

## AI Food Pairing

The food pairing feature uses Claude Sonnet 4.5 to analyze wines in your collection that are currently in their drinking window and recommend optimal pairings for your desired meal or ingredients.

## MCP Server Integration

The Celly MCP server enables AI assistants like Claude Desktop to interact with your wine collection through natural language. See [mcp-server/README.md](mcp-server/README.md) for setup instructions.

**Features:**
- View your complete wine collection organized by drinking status
- Get detailed information about specific wines including tasting notes
- Add new wines to your collection via natural language

**Example interactions:**
- "Show me my wine collection"
- "Add a Château Margaux 2015 to my collection"
- "What wines are ready to drink now?"

## Deployment

Hosted on Supabase (Free tier) for the database/auth/storage/edge functions, and on Cloudflare Pages for the frontend.

Release flow:
1. Push to `master` on GitHub — Cloudflare Pages builds and deploys the frontend automatically.
2. For schema changes: `npx supabase db push` to apply pending migrations to the cloud project.
3. For Edge Function changes: `npx supabase functions deploy <name> --no-verify-jwt`.

A Husky `pre-push` hook runs `tsc -b && npm test` as a safety net before anything reaches Cloudflare.

## Known Limitations

- Single user only (no sharing/collaboration features)
- AI features require the `claude-proxy` Edge Function and a configured `CLAUDE_API_KEY` (or a per-user key in Settings)

## License

[Your License Here]

## Contributing

[Contributing guidelines if applicable]
