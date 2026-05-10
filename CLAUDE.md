# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Celly is a wine cellar management application that enables users to track their wine collection, add tasting notes, and get AI-powered food pairing recommendations using Claude API.

## Development Commands

```bash
# Start development server (Vite + Supabase local)
npm run dev

# Build for production (TypeScript + Vite)
npm run build

# Lint codebase
npm run lint

# Run tests (Vitest + happy-dom + React Testing Library)
npm test           # single run
npm run test:watch # watch mode

# Preview production build
npm run preview

# Generate TypeScript types from Supabase schema
npm run gen-types

# Generate PWA icons from SVG source
npm run gen-icons

# Supabase commands (cloud workflow — no Docker)
npx supabase migration new <name>          # Scaffold a new migration file
npx supabase db push                       # Apply pending migrations to the linked cloud project
npx supabase functions deploy claude-proxy --no-verify-jwt
npx supabase secrets set CLAUDE_API_KEY=<key>

# MCP Server commands
cd mcp-server && npm install && npm run build  # Build MCP server
cd mcp-server && npm run dev                   # Watch mode for development
```

## Git hooks

A Husky pre-push hook (`.husky/pre-push`) runs `tsc -b && npm test` before every push. Cloudflare Pages auto-deploys on master push, so this is the safety net before code reaches production. Bypass with `git push --no-verify` only when intentional. Lint is intentionally not in the hook yet (existing errors block all pushes); re-add once those are cleared.

## Testing rule (always consider tests)

When making code changes, **always consider whether a test should accompany the change** and either add one or briefly state why it's not warranted. Defaults:

- **Bug fix** → add a regression test that would have failed on the broken code.
- **New pure function, utility, or hook logic** → add a unit test.
- **New component with non-trivial logic or branches** → add a render/interaction test using `@testing-library/react`.
- **Refactor of pure logic** → write tests *before* refactoring if none exist.
- **Copy/text, styling-only, config, or migration files** → tests are usually not warranted; say so explicitly.

Conventions:
- Co-locate tests next to source: `foo.ts` → `foo.test.ts` (or `.test.tsx`).
- Use `vitest` with explicit imports (`import { describe, it, expect } from 'vitest'`) — no globals.
- Prefer pure logic tests over heavy mocking. Only mock Supabase / Claude / network when there is no smaller seam.
- Tests must pass before pushing — the pre-push hook will block otherwise.

## Architecture

### Tech Stack Core
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: TanStack Router (file-based routing in `src/routes/`)
- **State Management**: TanStack Query for server state
- **UI Framework**: Mantine UI v8 with custom grape theme
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI Integration**: Anthropic Claude Sonnet 4.5 API
- **Internationalization**: react-i18next with English and German (Swiss) translations
- **Error Tracking**: Sentry for error monitoring and performance tracking
- **PWA Support**: Installable app with offline capabilities via Vite PWA plugin
- **MCP Server**: Model Context Protocol server for AI assistant integration

### Internationalization (i18n)

**Implementation** (`src/i18n/config.ts`):
- Uses `react-i18next` with `i18next-browser-languagedetector`
- Supports English (`en`) and Swiss German (`de-CH`)
- Translation files organized by namespace in `src/locales/{lang}/{namespace}.json`
- Namespaces: `common`, `dashboard`, `wines`, `pairing`, `auth`
- Language detection with localStorage persistence
- Fallback language: English

**Usage Pattern**:
```typescript
import { useTranslation } from 'react-i18next'

// Single namespace
const { t } = useTranslation('common')
t('common:buttons.save')

// Multiple namespaces
const { t } = useTranslation(['dashboard', 'common'])
t('dashboard:title')
t('common:buttons.cancel')
```

**LanguageSelector Component** (`src/components/LanguageSelector.tsx`):
- Dropdown in app header for language switching
- Persists selection to localStorage
- Available in `__root.tsx` navigation

### Data Flow Architecture

**TanStack Query Pattern:**
All server state is managed through custom hooks in `src/hooks/`:
- `useWines()` - Fetch all wines with auto-caching
- `useAddWine()`, `useUpdateWine()`, `useDeleteWine()` - Mutations with automatic cache invalidation
- `useTastingNotes()`, `useDashboardStats()`, `useFoodPairing()` - Similar patterns

**Key Pattern**: Mutations automatically call `queryClient.invalidateQueries()` to refresh data after changes.

### Supabase Integration

**Client Setup** (`src/lib/supabase.ts`):
- Single typed client instance using `Database` type from `src/types/database.ts`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Database Schema** (see `supabase/migrations/`):
- `wineries` table: Winery information (name, country_code) with RLS policies
- `wines` table: Core wine data with optional `winery_id` foreign key (ON DELETE RESTRICT), includes grapes[], vintage, quantity, price, drinking window, bottle_size, food_pairings, optional `import_batch_id`
- `tasting_notes` table: Rating (1-5 stars) + notes + date, cascades on wine deletion
- `stock_movements` table: Track wine additions/removals with automatic quantity updates via database triggers; carries `import_batch_id` so order-document imports can be retrieved as a unit
- `cellars` table: Physical cellar locations (name) for organizing wine storage
- `wine_locations` table: Maps wines to cellars with coordinates (shelf, row, column) and quantity per location. Supports multiple locations per wine (e.g., same wine in different cellars)
- `user_settings` table: Generic key-value store for user preferences (key TEXT, value JSONB)
- Row Level Security (RLS): All tables filtered by `auth.uid() = user_id`
- Storage bucket: `wine-images` with user-scoped folders
- Indexes on user_id, drink_window, vintage for query performance
- Automatic `updated_at` triggers on wineries, wines, cellars, wine_locations tables
- Automatic quantity update trigger on stock_movements table

**Photo Upload Pattern**:
1. Upload to `wine-images/{user_id}/{wineId}.{ext}` via `useUploadWinePhoto()`
2. Get public URL from Supabase Storage
3. Update wine record with `photo_url`

**Camera Capture** (`src/components/CameraCapture.tsx`):
- Modal-based camera interface using browser MediaDevices API
- Supports front/back camera switching (facingMode: 'user' vs 'environment')
- Live video preview with capture functionality
- Photo review with retake option before confirming
- Converts captured image to File object for upload (1920x1080 resolution, JPEG format, 0.9 quality)
- Integrated into `WineForm.tsx` via "Take Photo" button alongside dropzone

### Routing Structure (TanStack Router)

File-based routes in `src/routes/`:
- `__root.tsx` - App shell with AppShell layout and auth check
- `index.tsx` - Dashboard with statistics
- `login.tsx` - Auth page (login/signup tabs)
- `wines/index.tsx` - Wine list with search/filter; supports `?importBatchId=…` to filter by an import batch (union of newly-created wines and wines restocked in the same batch)
- `wines/add.tsx` - Add wine form (chooser: photo / free-text / manual)
- `wines/import.tsx` - Bulk import from a wine merchant's order document (PDF or image) — review table with editable rows and per-row include checkbox
- `wines/$id/index.tsx` - Wine detail with tasting notes and stock movements
- `wines/$id/edit.tsx` - Edit wine form
- `wines/$id/place.tsx` - Place a wine in cellar slots
- `wineries/index.tsx` - Winery list with search
- `wineries/add.tsx` - Add winery form
- `wineries/$id/index.tsx` - Winery detail with associated wines
- `wineries/$id/edit.tsx` - Edit winery form
- `cellars/index.tsx` - Cellar list and management
- `pairing.tsx` - AI food pairing interface

**Route Tree**: Auto-generated by `@tanstack/router-plugin` in `vite.config.ts`. Do not manually edit `src/routeTree.gen.ts`.

**URL Search Params** (`wines/index.tsx`):
- Wine filters are stored in URL search params for bookmarking and sharing
- Route uses `validateSearch` to parse and validate URL parameters
- Filters read from URL using `Route.useSearch()` and merged with defaults
- Only non-default filter values included in URL to keep it clean
- Navigation preserves filters using `router.history.back()` when returning from detail/edit/add pages

### Component Architecture

**Reusable Components** (`src/components/`):
- `WineForm.tsx` - Complex form with photo dropzone/camera capture, grape tags, vintage/price inputs, drinking window ranges, bottle size selection, food pairings textarea
- `WineCard.tsx` - Display wine in grid with "Ready to Drink" badge calculation
- `WineFilters.tsx` - Collapsible search/filter panel with multi-select grapes, vintage/price ranges, drinking window status, bottle size, data completeness filter
- `TastingNoteForm.tsx` - Rating widget + date picker + textarea using `@mantine/form`
- `TastingNoteCard.tsx` - Display note with rating stars and formatted date
- `StockMovementForm.tsx` - Form for adding stock movements (in/out) with quantity, date, and notes
- `StockMovementHistory.tsx` - Display stock movement history for a wine
- `WineryForm.tsx` - Form for adding/editing wineries with country selection
- `WineryCard.tsx` - Display winery with country flag and wine count
- `CameraCapture.tsx` - Modal-based camera interface for capturing wine photos with front/back camera switching
- `Breadcrumb.tsx` - Breadcrumb navigation with search param preservation for cross-resource navigation
- `PageHeader.tsx` - Reusable page header with back button, breadcrumbs, title, and action buttons
- `LanguageSelector.tsx` - Language switcher dropdown (English/Swiss German) in app header

**Forms**: Use `@mantine/form` (not react-hook-form). Form validation in `validate` object, no external schema libraries.

**Translation Pattern in Components**:
All user-facing text uses translation keys. Components import `useTranslation` and reference keys like `t('wines:form.fields.name.label')`. Never hardcode English strings in components.

### AI Integration Patterns

**Architecture**:
- Claude API requests are proxied through Supabase Edge Function (`supabase/functions/claude-proxy/`) for security
- API key is stored server-side, never exposed to the browser
- Frontend calls Edge Function with authentication token
- Edge Function validates user session and forwards requests to Claude API

**Edge Function** (`supabase/functions/claude-proxy/index.ts`):
- Handles two request types: `food-pairing` and `wine-enrichment`
- Validates user authentication via Supabase auth token
- Reads `CLAUDE_API_KEY` from server environment (set via Supabase secrets)
- Returns structured JSON responses to frontend
- All Claude API logic (prompts, parsing, validation) runs server-side

**AI Food Pairing Flow** (`src/lib/claude.ts` - `getFoodPairing` function):
1. Frontend collects available wines and menu/dish
2. Sends request to Edge Function with wine data and language preference
3. Edge Function formats wine list and sends prompt to Claude Sonnet 4.5
4. Claude returns JSON with pairing recommendations
5. Edge Function maps `wineIndex` back to actual wine IDs
6. Frontend displays ranked results with explanations and pairing scores

**AI Wine Enrichment** (`src/lib/claude.ts` - `enrichWineData` function):
- Frontend sends wine name and existing data to Edge Function
- Edge Function uses Claude Sonnet 4.5 to automatically fill missing wine data fields
- Can enrich: grapes, vintage, drinking window, winery (with intelligent matching), price, and food pairings
- Returns confidence levels: high, medium, low for each enriched field
- Edge Function validates all returned data (vintage ranges 1800-current year, country codes ISO 3166-1 alpha-2, price ranges 0-10000)
- Winery matching: Handles spelling variations (e.g., "Château" vs "Chateau") to avoid duplicates
- Food pairings generated in Swiss Standard German (Schweizer Hochdeutsch)
- Pre-flight validation ensures only wines with missing fields are enriched

**Enrichment Hooks** (`src/hooks/useWineEnrichment.ts`):
- `useEnrichWine()` - Single wine enrichment with automatic winery creation if needed
- `useBulkEnrichWines()` - Bulk enrichment with progress tracking and rate limiting (1 second delay between requests)
- Both hooks automatically invalidate wine and winery caches after enrichment
- Progress tracking pattern: `onProgress` callback with current/total counts for real-time UI updates

**API Configuration**:
- Uses Supabase's built-in `supabase.functions.invoke('claude-proxy', { body })` method
- Automatically handles authentication and edge function URL resolution
- Claude API key: Set `CLAUDE_API_KEY` in Supabase project secrets (production) or `supabase/.env` (local)
- Error handling shows notifications with detailed error messages

### Error Tracking with Sentry

**Architecture** (`src/lib/sentry.ts`):
- Sentry SDK integrated for error monitoring and performance tracking
- Initialized before React renders in `src/main.tsx`
- Events proxied through Supabase Edge Function (`supabase/functions/sentry-proxy/`) to avoid ad-blockers
- Optional integration - app works without Sentry DSN configured

**Configuration** (`src/config/environment.ts`):
- Environment variables: `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_DEBUG`
- Tunnel URL: Hardcoded to Supabase Edge Function endpoint
- Development mode: 100% session replay, console logging of events
- Production mode: 10% session replay, error-only capture

**Features**:
- Browser performance monitoring with `browserTracingIntegration()`
- Session replay with privacy (maskAllText, blockAllMedia)
- HTTP client breadcrumbs for failed requests (4xx, 5xx)
- TanStack Router instrumentation via `instrumentRouter()` function
- Source map upload via Sentry Vite plugin (production builds only)
- Release tracking via `VITE_SENTRY_RELEASE` environment variable

**Sentry Tunnel Edge Function**:
- Proxies Sentry events to avoid ad-blocker issues
- Deployed with `--no-verify-jwt` flag (public endpoint)
- Forwards requests to Sentry ingest endpoint

**Build Commands**:
```bash
npm run build        # Standard build with source maps
npm run build:sentry # Build with git commit hash as release name
```

### TypeScript Type Safety

**Database Types** (`src/types/database.ts`):
- Auto-generated from Supabase schema using `npm run gen-types`
- Command runs: `npx supabase gen types typescript --local > src/types/database.ts`
- Regenerate after any schema changes (migrations)
- Use `Database['public']['Tables']['wines']['Row']` pattern for table types
- Includes Row, Insert, Update types for each table, plus Relationships
- Import types with `type` keyword due to `verbatimModuleSyntax` in tsconfig

**Type Import Pattern**:
```typescript
// Correct
import { type WineFormValues } from './WineForm'

// Incorrect (will cause TS error)
import { WineFormValues } from './WineForm'
```

**Hook Type Pattern for Insert Operations**:
When creating hooks that add data to Supabase tables, use `Omit` to exclude `user_id` from input types since hooks add this automatically:
```typescript
type NewWinery = Omit<TablesInsert<'wineries'>, 'user_id'>

// Hook adds user_id internally
mutationFn: async (winery: NewWinery) => {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('wineries').insert({ ...winery, user_id: user.id })
}
```

**Type Generation Workflow**:
1. Create or modify migration in `supabase/migrations/`
2. Apply migration to cloud: `npx supabase db push`
3. Regenerate types from cloud: `npm run gen-types` (the script uses `--linked`)
4. Types in `src/types/database.ts` now match the cloud schema

### Mantine UI Theme

**Custom Theme** (`src/main.tsx`):
- Primary color: `grape` (purple/wine tones)
- Custom color scale defined in `MantineProvider`
- Default radius: `md`
- All Mantine CSS imports required in `main.tsx`
- i18n config imported to initialize translations

**Required CSS Imports**:
```typescript
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'
```

**Required Config Imports**:
```typescript
import './i18n/config' // Must import to initialize i18next
```

### Progressive Web App (PWA)

**Configuration** (`vite.config.ts`):
- Uses `vite-plugin-pwa` for automatic service worker generation
- Manifest auto-generated from configuration
- Auto-update strategy with user prompt for new versions
- Offline support with Workbox runtime caching

**Assets** (`public/`):
- `app-icon.svg` - Source SVG icon (grape/wine glass design)
- `pwa-192x192.png`, `pwa-512x512.png` - App icons for Android/Chrome
- `apple-touch-icon.png` - iOS home screen icon (180x180)
- `favicon.png` - Browser favicon (32x32)

**Icon Generation**:
Icons are generated from SVG using the `sharp` library:
```bash
npm run gen-icons  # Regenerate all PWA icons from app-icon.svg
```

**Service Worker Registration** (`src/main.tsx`):
- Service worker registered via `virtual:pwa-register`
- Update prompt shows when new version is available
- Offline-ready notification in console

**Manifest Configuration**:
- Name: "Celly - Wine Cellar Manager"
- Theme color: `#9b59b6` (grape purple)
- Display mode: `standalone` (full-screen app experience)
- Orientation: `portrait` (optimized for mobile)

**Caching Strategy**:
- Static assets (JS, CSS, HTML, images) precached on install
- Supabase API responses cached with NetworkFirst strategy (24-hour expiration)
- Cache name: `supabase-cache`

**Installation**:
- Chrome/Edge (desktop): Install icon in address bar
- Chrome (Android): "Add to Home Screen" in menu
- Safari (iOS): Share → "Add to Home Screen"

## Environment Setup

### Frontend Environment Variables

Required environment variables in `.env.local`:

```bash
# Cloud Supabase project (no local Docker)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Note: Edge Function URL is automatically resolved from `VITE_SUPABASE_URL` using Supabase's `functions.invoke()` method.

Copy `.env.example` to `.env.local` and fill in values.

### Edge Function Secrets

The Claude API key lives **server-side only** as a Supabase secret — never put it in `.env.local` or in browser-bound env vars.

```bash
npx supabase secrets set CLAUDE_API_KEY=sk-ant-<your-key>
```

Or set it in the dashboard: Settings → Edge Functions → Secrets → `CLAUDE_API_KEY`.

End users can also bring their own Claude API key via the in-app Settings page; per-user keys are stored in `user_settings` and the `claude-proxy` Edge Function prefers them over the global secret.
3. Secrets are automatically available to all Edge Functions

## Database Migrations

**Creating Migrations**:
```bash
npx supabase migration new <descriptive_name>
```

**Applying Migrations** (cloud — no local Docker):
```bash
npx supabase db push
```

**Schema Changes Workflow**:
1. Create migration file in `supabase/migrations/`
2. Apply to cloud: `npx supabase db push`
3. Regenerate types: `npm run gen-types` (script uses `--linked`)
4. RLS policies must be included in migration for new tables
5. Storage policies for new buckets must be defined in migrations

**Seed Data** (`supabase/seed.sql`): retained for completeness but not part of the regular workflow — the cloud DB is the source of truth and is not reset.

**Migration history**: see `supabase/migrations/` directly. Recent additions worth knowing:
- `20260115203000_redesign_wine_locations.sql` — slot-based `wine_locations` (replaced inline location fields on `wines`)
- `20260503110000_make_wine_images_private.sql` — bucket flipped to private; consumers use `useWinePhotoUrl` (signed URLs)
- `20260503180000_wine_locations_as_slots.sql` — each row is a slot, `wine_id` nullable
- `20260510120000_add_import_batch_id.sql` — `import_batch_id` on `wines` and `stock_movements` for the order-document import feature

## Common Patterns

### Stock Inventory Management

**Database Trigger Pattern**:
Stock movements use database-level triggers for automatic wine quantity updates, ensuring data consistency:
```sql
CREATE FUNCTION update_wine_quantity_on_movement()
CREATE TRIGGER update_wine_quantity AFTER INSERT OR UPDATE OR DELETE ON stock_movements
```

**Stock Movement Hooks** (`src/hooks/useStockMovements.ts`):
- `useStockMovements(wineId?)` - Query stock movements for a wine or all wines
- `useAddStockMovement()` - Add new movement (type: 'in' | 'out'), automatic quantity update via trigger
- `useUpdateStockMovement()` - Update existing movement
- `useDeleteStockMovement()` - Delete movement, quantity auto-reverted via trigger

**Integration**: Stock movements displayed in wine detail pages with automatic quantity sync.

### Wineries as First-Class Resource

**Winery Management** (`src/hooks/useWineries.ts`):
- `useWineries()` - Query all wineries
- `useWinery(id)` - Query single winery with associated wines
- `useAddWinery()` - Add winery (uses `Omit<TablesInsert<'wineries'>, 'user_id'>` pattern)
- `useUpdateWinery()` - Update winery
- `useDeleteWinery()` - Delete winery (protected by ON DELETE RESTRICT on wines FK)

**Winery Routes**:
- `/wineries/` - List with search functionality
- `/wineries/add` - Add new winery
- `/wineries/$id/` - Detail page showing all wines from winery
- `/wineries/$id/edit` - Edit winery

**Integration with Wines**:
- Wines have optional `winery_id` foreign key
- AI enrichment can automatically create wineries when needed
- Winery matching prevents duplicates (handles spelling variations)

### Bulk Import from Order Document

**Architecture**:
The user uploads a wine merchant's PDF or image; Claude extracts a list of wines that the user reviews in an editable table before persisting. Restocks of existing wines and creation of new ones happen in the same operation, grouped by a client-generated batch UUID.

**Edge Function** (`supabase/functions/claude-proxy/index.ts`):
A `parse-order-document` request type sends the file as either a `document` (PDFs) or `image` content block to Claude Sonnet 4.5 with a strict JSON-output prompt and an explicit injection-defense preamble. Server-side validates type + size (5 MB cap), runs every parsed row through whitelist checks (vintage range, bottle-size enum, ISO country code), and drops invalid rows.

**Frontend** (`src/lib/claude.ts`, `src/hooks/useOrderImport.ts`):
- `parseOrderDocument(file)` — base64-encodes the file and invokes the proxy. Rejects unsupported MIME types client-side before the call.
- `useParseOrderDocument()` / `useBulkImportWines()` — TanStack mutations.

**Bulk-save semantics** (`useBulkImportWines`):
- Resolves wineries in two phases: Fuse fuzzy match (threshold 0.3, same as `useEnrichWine`), then a single batched insert for the unmatched names (deduped case-insensitively). Uses `supabase.from('wineries').insert()` directly to avoid the toast spam that `useAddWinery` would produce.
- Single `supabase.from('wines').insert()` for all "create new" rows; single `supabase.from('stock_movements').insert()` for all restocks. Both writes carry the same `import_batch_id` UUID.
- Returns `{ batchId, created, restocked, skipped, failures[] }` for a single summary toast.

**UI**:
- `/wines/import` — two-step page (upload → review). Dropzone accepts `[png, jpeg, gif, webp, pdf]` only (the full `IMAGE_MIME_TYPE` constant from `@mantine/dropzone` includes formats the edge function rejects).
- `OrderImportTable` — checkbox per row toggles `included`; the Name column is a Mantine `Combobox` that lets the user either pick an existing wine (then row becomes a restock — vintage/price/bottle/winery editors disable since they're pinned) or type a new name (creates a new wine). Action shape is derived from `(included, existingWineId)`, not a separate radio.
- After save, navigates to `/wines?importBatchId=…`. The wines list applies a union post-filter — `wines.import_batch_id === batchId OR a stock_movement.import_batch_id === batchId for that wine` — so newly-created wines and restocked wines both show up under the batch chip. Reuses the `useStockMovements()` query already loaded by the wines list, no extra fetch.

### Physical Location Tracking

**Architecture**:
- Redesigned in migration `20260115203000_redesign_wine_locations.sql` to support multiple locations per wine
- Previous design had location fields (cellar_id, shelf, row, column) directly on wines table
- Current design uses separate `wine_locations` table for flexibility

**Cellar Management** (`src/hooks/useCellars.ts`):
- `useCellars()` - Query all cellars
- `useAddCellar()` - Add new cellar with name
- `useUpdateCellar()` - Update cellar details
- `useDeleteCellar()` - Delete cellar (cascades to wine_locations via ON DELETE CASCADE)

**Wine Location Management** (`src/hooks/useWineLocations.ts`):
- `useWineLocations(wineId?)` - Query locations for a wine or all locations
- `useAddWineLocation()` - Add wine to a cellar location with coordinates (shelf, row, column) and quantity
- `useUpdateWineLocation()` - Update location details or quantity
- `useDeleteWineLocation()` - Remove wine from location

**Location Pattern**:
- One wine can exist in multiple cellars simultaneously (e.g., 3 bottles in cellar A, 2 bottles in cellar B)
- Each `wine_location` record has its own quantity independent of wine.quantity
- Coordinates (shelf, row, column) are optional integers for flexible organization
- Foreign keys: `wine_id` → wines, `cellar_id` → cellars (both CASCADE on delete)

**Routes**:
- `/cellars/` - List cellars with wine counts and location management

### User Settings

**Generic Settings Storage** (`src/hooks/useUserSettings.ts`):
- Key-value store for user preferences using JSONB values
- Table structure: `user_id`, `key` (TEXT), `value` (JSONB), `updated_at`
- UNIQUE constraint on (user_id, key) ensures one value per setting per user
- Automatic `updated_at` trigger on changes

**Hook Pattern**:
```typescript
// Get a setting
const { data: setting } = useUserSetting('theme')

// Update or create setting
const updateSetting = useUpdateUserSetting()
await updateSetting.mutateAsync({ key: 'theme', value: { mode: 'dark' } })
```

**Use Cases**:
- UI preferences (theme, language overrides)
- Feature flags per user
- Dashboard customization
- Any user-scoped configuration

### Navigation with Breadcrumbs

**Cross-Resource Navigation Pattern**:
When navigating between resources (e.g., winery → wine), preserve context using URL search params:
```typescript
// Navigate from winery detail to wine detail
navigate({
  to: '/wines/$id',
  params: { id: wineId },
  search: { from: 'winery', wineryId, wineryName }
})

// Build breadcrumbs with preserved context
const breadcrumbs = useMemo((): BreadcrumbItem[] => {
  if (search.from === 'winery' && search.wineryId) {
    return [
      { label: 'Home', to: '/' },
      { label: 'Wineries', to: '/wineries' },
      { label: search.wineryName, to: `/wineries/${search.wineryId}` },
      { label: wine.name, to: undefined },
    ]
  }
  // Default breadcrumbs...
}, [wine, search])
```

**PageHeader Component**: Combines back button (uses `router.history.back()`), breadcrumbs, title, and action buttons for consistent page headers.

### Country Management with i18n

**Pattern** (`src/constants/countries.ts`):
Countries are translated via i18n instead of hardcoded English names:
```typescript
import { getCountryOptions } from '@/constants/countries'

// In component
const { t } = useTranslation('common')
const countryOptions = getCountryOptions(t) // Returns translated countries with flags
```

Translation keys: `common:countries.FR`, `common:countries.IT`, etc.

### Adding a New Data Entity

1. Create migration in `supabase/migrations/` with table definition and RLS policies
2. Apply to cloud: `npx supabase db push`
3. Generate types: `npm run gen-types` (updates `src/types/database.ts`)
4. Create custom hooks in `src/hooks/use<Entity>.ts` with query/mutation functions
5. Create form component in `src/components/<Entity>Form.tsx` using `@mantine/form`
6. Create display component in `src/components/<Entity>Card.tsx`
7. Add translation keys to `src/locales/en/{namespace}.json` and `src/locales/de-CH/{namespace}.json`
8. Create routes in `src/routes/<entity>/` for list/detail/add/edit

### Search/Filter Implementation

Filter logic uses `useMemo` for performance (see `src/routes/wines/index.tsx`):
- Combine filters with AND logic (all filters must match)
- Text search: case-insensitive `includes()`
- Arrays (grapes, bottle sizes): `some()` for OR logic within filter
- Ranges: check both min and max boundaries
- Drinking window: calculate `isReady`, `isFuture`, `isPast` based on current year
- Data completeness: 'complete' wines have winery, grapes, vintage, and drinking window; 'incomplete' wines missing at least one field (useful for identifying wines needing AI enrichment)

**URL Search Params Pattern**:
```typescript
// 1. Define validateSearch in route config
validateSearch: (search: Record<string, unknown>): Partial<FilterValues> => {
  // Parse and validate each search param
  const validated: Partial<FilterValues> = {}
  if (typeof search.search === 'string' && search.search) {
    validated.search = search.search
  }
  return validated
}

// 2. Read search params and merge with defaults
const search = Route.useSearch()
const filters: FilterValues = { ...defaultFilters, ...search }

// 3. Update filters by navigating with new search params
const setFilters = (newFilters: FilterValues) => {
  const searchParams: Partial<FilterValues> = {}
  // Only include non-default values
  if (newFilters.search) searchParams.search = newFilters.search
  navigate({ to: '/wines', search: searchParams, replace: true })
}

// 4. Use router.history.back() to preserve filters when navigating back
const router = useRouter()
onClick={() => router.history.back()}
```

### Photo Upload Pattern

**Traditional Upload**:
```typescript
// 1. Upload file
const photoUrl = await uploadPhoto.mutateAsync({ file, wineId })

// 2. Update record with URL
await updateWine.mutateAsync({ id: wineId, photo_url: photoUrl })
```

**Camera Capture Integration**:
- `CameraCapture.tsx` provides modal-based camera interface
- Supports front/back camera switching
- Returns File object compatible with upload hook
- Integrated in `WineForm.tsx` via "Take Photo" button

Storage path: `{user_id}/{wineId}.{ext}` for automatic RLS via storage policies.

### Adding New Translations

When adding new features or text:
1. Add translation keys to both `src/locales/en/{namespace}.json` and `src/locales/de-CH/{namespace}.json`
2. Use nested keys for organization: `"form": { "fields": { "name": { "label": "Name" } } }`
3. Import `useTranslation` in component: `const { t } = useTranslation('namespace')`
4. Reference keys: `t('form.fields.name.label')`
5. For pluralization: use `t('key', { count: n })` with separate singular/plural keys
6. Keep namespaces focused: common (buttons, errors), wines (wine-specific), dashboard, etc.

### MCP Server Integration

**Overview**:
The Model Context Protocol (MCP) server enables AI assistants like Claude Desktop to interact with Celly through natural language. Users can view their wine collection and add wines conversationally.

**Architecture** (`mcp-server/`):
- Standalone Node.js application using `@modelcontextprotocol/sdk`
- Communicates with Supabase REST API using authenticated user tokens
- Runs as stdio transport for Claude Desktop integration
- TypeScript source in `src/`, compiled to `dist/`

**Setup**:
```bash
cd mcp-server
npm install
npm run build
```

**Configuration**:
MCP server requires three environment variables:
- `SUPABASE_URL` - Supabase instance URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `USER_AUTH_TOKEN` - User's auth token from Supabase auth

**Claude Desktop Integration**:
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "celly": {
      "command": "node",
      "args": ["/absolute/path/to/celly/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "http://127.0.0.1:54321",
        "SUPABASE_ANON_KEY": "your-key",
        "USER_AUTH_TOKEN": "your-token"
      }
    }
  }
}
```

**Resources**:
- `celly://wines` - Wine collection organized by drinking status
- `celly://wines/{id}` - Individual wine details with tasting notes
- `celly://wineries` - List of wineries with country codes
- `celly://wineries/{id}` - Winery details with associated wines

**Tools**:
- `list_wines` / `get_wine` / `add_wine` - Wine management (add takes name, vintage, grapes, quantity, drink_window_start, drink_window_end, price, bottle_size as text e.g. "75cl", food_pairings, winery_id)
- `list_wineries` / `get_winery` / `add_winery` - Winery management (add takes name and ISO 3166-1 alpha-2 country_code)

**Security**:
- All requests authenticated via user token
- Row Level Security (RLS) enforced by Supabase
- No admin privileges or cross-user access

**Files**:
- `mcp-server/src/index.ts` - Main server with resource/tool handlers
- `mcp-server/src/client.ts` - Supabase REST API client
- `mcp-server/src/resources.ts` - Resource formatters (markdown)
- `mcp-server/src/tools.ts` - Tool implementations
- `mcp-server/src/config.ts` - Environment configuration
- `mcp-server/src/types.ts` - TypeScript interfaces

See [mcp-server/README.md](mcp-server/README.md) for detailed documentation.

## Known Constraints

- **Single User**: No multi-user/sharing features (intentionally scoped out)
- **Cloud-Only Workflow**: We work directly against the linked cloud Supabase project — no local Docker / `supabase start` / `db reset`. Migrations land via `npx supabase db push`; types are regenerated from the cloud via `npm run gen-types` (already `--linked`).
- **AI Rate Limiting**: Bulk enrichment uses a 1 second delay between requests to avoid API rate limits
- **Food Pairing Language**: Food pairings must be in Swiss Standard German (Schweizer Hochdeutsch)

## Deployment Considerations

For cloud deployment:

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com) and create a new project
- Wait for project provisioning to complete

### 2. Deploy Database Schema
```bash
# Link to your cloud project
npx supabase link --project-ref <your-project-ref>

# Push migrations to cloud
npx supabase db push

# Verify schema
npx supabase db pull
```

### 3. Deploy Edge Functions
```bash

# Deploy the Sentry proxy function
npx supabase functions deploy sentry-proxy --no-verify-jwt

# Deploy the Claude proxy function
npx supabase functions deploy claude-proxy --no-verify-jwt

# Set Claude API key as a secret
npx supabase secrets set CLAUDE_API_KEY=sk-ant-your-key-here
```

Alternatively, set secrets via Dashboard:
1. Go to Settings → Edge Functions → Secrets
2. Add `CLAUDE_API_KEY` with your production API key

### 4. Configure Storage
Create the `wine-images` bucket:
1. Go to Storage in Supabase Dashboard
2. Create bucket named `wine-images`
3. Set as public bucket with user-scoped RLS policies (already defined in migrations)

### 5. Update Frontend Environment
Update `.env.production` or deployment platform (Vercel/Netlify/Cloudflare Pages):
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Sentry (optional - app works without these)
VITE_SENTRY_DSN=<your-sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0
VITE_SENTRY_RELEASE=<git-commit-hash>

# For Sentry build process (if using Sentry Vite plugin)
SENTRY_ORG=<your-sentry-org>
SENTRY_PROJECT=<your-sentry-project>
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
```

Edge Function URL is automatically resolved using `supabase.functions.invoke()`.

**Note**: The Sentry tunnel URL in `src/config/environment.ts` is hardcoded to the production Supabase function endpoint. Update this if deploying to a different Supabase project.

### 6. Deploy Frontend
- Deploy to Vercel/Netlify/Cloudflare Pages
- Ensure environment variables are configured
- Build command: `npm run build` (or `npm run build:sentry` for automatic release tracking)
- Output directory: `dist`

### 7. Testing Production AI Features
- Claude API requests now go through Edge Function
- API key is secure on server-side
- All requests require valid Supabase authentication
