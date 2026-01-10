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

# Preview production build
npm run preview

# Generate TypeScript types from Supabase schema
npm run gen-types

# Supabase commands
npx supabase start          # Start local Supabase (Docker required)
npx supabase stop           # Stop local Supabase
npx supabase status         # Check Supabase status
npx supabase db reset       # Reset database and apply migrations
npx supabase migration new <name>  # Create new migration
```

## Architecture

### Tech Stack Core
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: TanStack Router (file-based routing in `src/routes/`)
- **State Management**: TanStack Query for server state
- **UI Framework**: Mantine UI v8 with custom grape theme
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI Integration**: Anthropic Claude Sonnet 4.5 API
- **Internationalization**: react-i18next with English and German (Swiss) translations

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
- `wines` table: Core wine data with optional `winery_id` foreign key (ON DELETE RESTRICT), includes grapes[], vintage, quantity, price, drinking window, bottle_size, food_pairings
- `tasting_notes` table: Rating (1-5 stars) + notes + date, cascades on wine deletion
- `stock_movements` table: Track wine additions/removals with automatic quantity updates via database triggers
- Row Level Security (RLS): All tables filtered by `auth.uid() = user_id`
- Storage bucket: `wine-images` with user-scoped folders
- Indexes on user_id, drink_window, vintage for query performance
- Automatic `updated_at` triggers on wineries and wines tables
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
- `wines/index.tsx` - Wine list with search/filter
- `wines/add.tsx` - Add wine form
- `wines/$id/index.tsx` - Wine detail with tasting notes and stock movements
- `wines/$id/edit.tsx` - Edit wine form
- `wineries/index.tsx` - Winery list with search
- `wineries/add.tsx` - Add winery form
- `wineries/$id/index.tsx` - Winery detail with associated wines
- `wineries/$id/edit.tsx` - Edit winery form
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

**AI Food Pairing Flow** (`src/lib/claude.ts` - `getPairings` function):
1. Filter wines to those in drinking window: `currentYear >= drink_window_start AND currentYear <= drink_window_end`
2. Format wine list as numbered text for Claude
3. Send prompt to Claude Sonnet 4.5 requesting JSON response with pairing recommendations
4. Parse JSON, map `wineIndex` back to actual wine IDs
5. Display ranked results with explanations and pairing scores

**AI Wine Enrichment** (`src/lib/claude.ts` - `enrichWineData` function):
- Uses Claude Sonnet 4.5 to automatically fill missing wine data fields
- Can enrich: grapes, vintage, drinking window, winery (with intelligent matching), price, and food pairings
- Returns confidence levels: high, medium, low for each enriched field
- Validates all returned data (vintage ranges 1800-current year, country codes ISO 3166-1 alpha-2, price ranges 0-10000)
- Winery matching: Handles spelling variations (e.g., "Château" vs "Chateau") to avoid duplicates
- Food pairings generated in Swiss Standard German (Schweizer Hochdeutsch)
- Pre-flight validation ensures only wines with missing fields are enriched

**Enrichment Hooks** (`src/hooks/useWineEnrichment.ts`):
- `useEnrichWine()` - Single wine enrichment with automatic winery creation if needed
- `useBulkEnrichWines()` - Bulk enrichment with progress tracking and rate limiting (1 second delay between requests)
- Both hooks automatically invalidate wine and winery caches after enrichment
- Progress tracking pattern: `onProgress` callback with current/total counts for real-time UI updates

**API Configuration**:
- Uses `dangerouslyAllowBrowser: true` for local development
- Expects `VITE_CLAUDE_API_KEY` environment variable
- Error handling in hooks shows notifications with detailed error messages

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
2. Apply migration: `npx supabase db reset`
3. Regenerate types: `npm run gen-types`
4. Types in `src/types/database.ts` now match database schema

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

## Environment Setup

Required environment variables in `.env.local`:

```bash
# Supabase (get from `npx supabase start` output)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon-key>

# Claude API (get from console.anthropic.com)
VITE_CLAUDE_API_KEY=sk-ant-<your-key>
```

Copy `.env.example` to `.env.local` and fill in values.

## Database Migrations

**Creating Migrations**:
```bash
npx supabase migration new <descriptive_name>
```

**Applying Migrations**:
```bash
npx supabase db reset  # Resets DB and applies all migrations + seed data
```

**Schema Changes Workflow**:
1. Create migration file in `supabase/migrations/`
2. Apply migration: `npx supabase db reset`
3. Regenerate types: `npm run gen-types`
4. RLS policies must be included in migration for new tables
5. Storage policies for new buckets must be defined in migrations

**Seed Data** (`supabase/seed.sql`):
- Contains test user creation and sample wine imports
- Automatically applied during `npx supabase db reset`
- Uses hardcoded UUID for test user (`87348a9f-513c-463d-82eb-89b883d4ddc6`)
- Includes auth.users and auth.identities setup for local testing

**Migration History**:
1. `20260103090129_create_wine_tables.sql` - Base schema (wineries, wines, tasting_notes)
2. `20260108203902_add_stock_movements.sql` - Stock inventory with automatic quantity triggers
3. `20260110081833_add_food_pairings_to_wines.sql` - Food pairings column (Swiss German)
4. `20260110101108_add_bottle_size_to_wines.sql` - Bottle size tracking

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
2. Apply migration: `npx supabase db reset`
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

## Known Constraints

- **Single User**: No multi-user/sharing features (intentionally scoped out)
- **Local Development**: Supabase runs locally via Docker (requires Docker Desktop)
- **No Import/Export**: Users cannot bulk import or export wine data
- **No Location Tracking**: Physical cellar location not tracked
- **Browser API Keys**: Claude API key exposed in browser (acceptable for local dev, needs backend proxy for production)
- **AI Rate Limiting**: Bulk enrichment uses 1 second delay between requests to avoid API rate limits
- **Food Pairing Language**: Food pairings must be in Swiss Standard German (Schweizer Hochdeutsch)

## Deployment Considerations

Currently local-only. For cloud deployment:
1. Create Supabase project at supabase.com
2. Run `npx supabase db push` to push schema
3. Update environment variables to cloud URLs
4. Deploy frontend to Vercel/Netlify
5. Create storage bucket `wine-images` with public read access
6. Move Claude API calls to backend Edge Function to protect API key
