# Celly - Wine Cellar Management

A modern wine cellar management application that enables wine enthusiasts to track their collection, add tasting notes, and get AI-powered food pairing recommendations.

## Features

- **Wine Collection Management**: Track wines with detailed information including winery, grapes, vintage, quantity, price, and drinking windows
- **Photo Storage**: Upload and store wine bottle photos
- **Tasting Notes**: Add ratings (1-5 stars), notes, and dates for each wine
- **Smart Filtering**: Search and filter by name, winery, grapes, vintage range, price range, and drinking window status
- **Dashboard Statistics**: Visual overview of collection with charts and key metrics
- **AI Food Pairing**: Get intelligent food pairing recommendations powered by Claude Sonnet 4.5 API
- **Winery Database**: Track and organize wines by winery with country information
- **Internationalization**: Full support for English and Swiss German (de-CH)
- **Drinking Window Tracking**: Know which wines are ready to drink, aging, or past their prime

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
- Docker Desktop (for local Supabase)
- Anthropic API key (get from [console.anthropic.com](https://console.anthropic.com))

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

3. **Start Supabase locally**
   ```bash
   npx supabase start
   ```
   This will output your local Supabase URL and anon key. Keep these for the next step.

4. **Configure environment variables**

   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` with your values:
   ```bash
   # Supabase (from `npx supabase start` output)
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<your-anon-key>

   # Claude API (from console.anthropic.com)
   VITE_CLAUDE_API_KEY=sk-ant-<your-key>
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:5173

6. **Login with test credentials**

   Email: `test@example.com`
   Password: `password123`

## Development Commands

```bash
# Development
npm run dev              # Start Vite dev server + Supabase local

# Building
npm run build           # TypeScript compilation + Vite build
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint

# Database
npm run gen-types       # Generate TypeScript types from Supabase schema
npx supabase db reset   # Reset database and apply migrations
npx supabase migration new <name>  # Create new migration

# Supabase
npx supabase start      # Start local Supabase
npx supabase stop       # Stop local Supabase
npx supabase status     # Check Supabase status
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
│   └── seed.sql           # Test data
└── CLAUDE.md              # AI coding assistant guide
```

## Database Schema

- **wineries**: Winery information (name, country)
- **wines**: Core wine data with grapes, vintage, quantity, price, drinking window, optional winery reference
- **tasting_notes**: Ratings, notes, and dates for wines
- **wine-images**: Storage bucket for wine bottle photos

All tables use Row Level Security (RLS) filtered by authenticated user ID.

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

**Note**: The Claude API key is currently used directly in the browser (suitable for local development). For production deployment, move API calls to a backend Edge Function.

## Deployment

Currently configured for local development. For cloud deployment:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Push schema: `npx supabase db push`
3. Create storage bucket `wine-images` with public read access
4. Update `.env.local` with cloud URLs
5. Move Claude API calls to backend Edge Function
6. Deploy frontend to Vercel, Netlify, or similar

## Known Limitations

- Single user only (no sharing/collaboration features)
- Requires Docker for local Supabase
- No bulk import/export functionality
- No physical cellar location tracking
- Browser-based Claude API calls (not production-ready)

## License

[Your License Here]

## Contributing

[Contributing guidelines if applicable]
