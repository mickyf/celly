# Wine Cellar App - Implementation Plan

## Requirements Summary

### Core Functionality
- ✅ Inventory management (add, remove, update wines)
- ✅ Wine details: name, grape varieties, quantity
- ✅ Tasting notes and ratings
- ✅ Purchase price tracking
- ✅ Drinking window tracking (year range: 2025-2030)
- ✅ Photo attachments for bottles/labels
- ✅ Track wines by quantity (not individual bottles)

### Features
- ✅ Search and filter (by grape, price, drinking window, etc.)
- ✅ Reports and statistics dashboard
- ✅ Smart suggestions for wines to drink soon
- ✅ AI Food Pairing with Claude API
  - Text input for menu/dishes
  - Only suggests wines within drinking window and in stock
  - Provides pairing explanations and reasoning

### Out of Scope
- ❌ Physical location tracking
- ❌ Full purchase history
- ❌ Value tracking
- ❌ Multi-user support
- ❌ Data import/export

---

## Technology Stack (Local Development)

**Frontend:** React + TypeScript + TanStack Router + TanStack Query
**UI Library:** Mantine UI
**Backend:** Supabase Local (self-hosted via Docker)
- Database: PostgreSQL (local instance)
- Authentication: Supabase Auth (local)
- Storage: Supabase Storage (local file system)

**API:** Supabase JavaScript client + Supabase Edge Functions (local)
**AI Integration:** Claude API (Anthropic)
**Development:** Vite for build tooling

### Benefits of This Stack
- Full Supabase stack running locally via Docker
- TanStack for routing and data fetching
- Easy migration to cloud later (just change Supabase URL/keys)
- Fast local development without deployment

---

## Phase 1: Project Setup

### 1. Initialize Project
```bash
npm create vite@latest wine-cellar -- --template react-ts
cd wine-cellar
npm install
```

### 2. Install Dependencies
```bash
# Core
npm install @supabase/supabase-js

# TanStack
npm install @tanstack/react-router @tanstack/react-query @tanstack/router-devtools

# Mantine UI
npm install @mantine/core @mantine/hooks @mantine/form @mantine/notifications @mantine/dropzone @mantine/dates @mantine/charts
npm install -D postcss postcss-preset-mantine postcss-simple-vars

# Icons (for Mantine)
npm install @tabler/icons-react

# Claude API
npm install @anthropic-ai/sdk

# Date handling (required by @mantine/dates)
npm install dayjs
```

### 3. Setup Supabase Local
```bash
# Install Supabase CLI
npm install -D supabase

# Initialize Supabase
npx supabase init

# Start local Supabase
npx supabase start
```

**Note:** After running `npx supabase start`, save the output which contains:
- API URL (typically `http://localhost:54321`)
- Anon key
- Service role key
- Database URL

### 4. Configure Mantine

**Create `postcss.config.cjs`:**
```javascript
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

**Update `src/main.tsx`:**
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import App from './App'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <Notifications />
      <App />
    </MantineProvider>
  </React.StrictMode>,
)
```

---

## Phase 2: Database Schema

### Database Tables

```sql
-- wines table
CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  grapes TEXT[], -- Array of grape varieties
  vintage INTEGER,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2),
  drink_window_start INTEGER, -- Year
  drink_window_end INTEGER,   -- Year
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- tasting_notes table
CREATE TABLE tasting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  tasted_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX wines_user_id_idx ON wines(user_id);
CREATE INDEX wines_drink_window_idx ON wines(drink_window_start, drink_window_end);
CREATE INDEX tasting_notes_wine_id_idx ON tasting_notes(wine_id);

-- Row Level Security
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wines" ON wines
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tasting notes" ON tasting_notes
  FOR ALL USING (auth.uid() = user_id);
```

### Migration Files
Create migration in `supabase/migrations/`:
```bash
npx supabase migration new create_wine_tables
```

---

## Phase 3: Frontend Architecture

### Folder Structure
```
src/
├── routes/              # TanStack Router routes
│   ├── __root.tsx
│   ├── index.tsx       # Dashboard
│   ├── wines/
│   │   ├── index.tsx   # Wine list
│   │   ├── $id.tsx     # Wine detail
│   │   └── add.tsx     # Add wine
│   ├── pairing.tsx     # Food pairing
│   └── login.tsx
├── lib/
│   ├── supabase.ts     # Supabase client
│   └── claude.ts       # Claude API client
├── hooks/
│   ├── useWines.ts     # TanStack Query hooks
│   └── useTastingNotes.ts
├── components/
│   ├── WineCard.tsx
│   ├── WineForm.tsx
│   ├── TastingNoteForm.tsx
│   ├── SearchFilter.tsx
│   ├── Dashboard.tsx
│   └── ui/             # Reusable UI components
├── types/
│   └── database.ts     # TypeScript types
└── utils/
    └── helpers.ts
```

---

## Phase 4: Key Implementation Details

### Supabase Client Setup

**`src/lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**`.env.local`:**
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-from-supabase-start
VITE_CLAUDE_API_KEY=your-claude-api-key
```

### TanStack Query Setup

**`src/hooks/useWines.ts`:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useWines = () => {
  return useQuery({
    queryKey: ['wines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })
}

export const useAddWine = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (wine: NewWine) => {
      const { data, error } = await supabase
        .from('wines')
        .insert(wine)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    }
  })
}
```

### Claude API Integration

**`src/lib/claude.ts`:**
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
})

export async function getFoodPairing(menu: string, availableWines: Wine[]) {
  const wineList = availableWines.map(w =>
    `- ${w.name} (${w.vintage}) - Grapes: ${w.grapes.join(', ')}, Quantity: ${w.quantity}`
  ).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a sommelier. Given this menu/dish and available wines, suggest the best pairings.

Menu: ${menu}

Available wines in cellar:
${wineList}

Please provide:
1. Top 3 wine recommendations (ranked)
2. For each wine, explain why it pairs well with the dish
3. Highlight specific flavor interactions

Format as JSON:
{
  "recommendations": [
    {
      "wineId": "uuid",
      "wineName": "Wine Name",
      "rank": 1,
      "pairing_score": 95,
      "explanation": "Detailed explanation..."
    }
  ]
}`
    }]
  })

  return JSON.parse(message.content[0].text)
}
```

### Food Pairing Flow
1. User inputs menu text in pairing page
2. Fetch wines currently in drinking window (query by year)
3. Filter wines with quantity > 0
4. Send menu + wine list to Claude API
5. Parse and display results with explanations
6. Allow user to view wine details or mark as consumed

### Search & Filter Implementation
```typescript
// Filter wines by multiple criteria
const { data } = await supabase
  .from('wines')
  .select('*')
  .contains('grapes', ['Cabernet Sauvignon'])
  .gte('price', minPrice)
  .lte('price', maxPrice)
  .gte('vintage', minYear)
  .lte('vintage', maxYear)
  .ilike('name', `%${searchTerm}%`)
```

### Dashboard Statistics
- **Total bottles:** `SUM(quantity)`
- **Total value:** `SUM(price * quantity)`
- **Wines ready now:** Filter by `drink_window_start <= current_year <= drink_window_end`
- **Top grapes:** Aggregate `grapes` array, count occurrences
- **Recent tastings:** Latest 5-10 tasting notes with ratings

### Photo Upload
```typescript
async function uploadWinePhoto(file: File, wineId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${wineId}.${fileExt}`
  const filePath = `wine-photos/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('wine-images')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('wine-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}
```

---

## Phase 5: Development Roadmap

### Sprint 1: Foundation (Week 1)
1. Set up project foundation (Vite + React + TypeScript + Mantine)
2. Install and configure Supabase local development environment
3. Design database schema (wines, tasting_notes tables)
4. Set up TanStack Router and basic app structure
5. Configure TanStack Query for data fetching
6. Configure Mantine theme and providers
7. Implement Supabase authentication (local)

### Sprint 2: Core Features (Week 2)
7. Build wine inventory CRUD operations (add, edit, delete, list)
8. Create wine detail form with photo upload
9. Implement tasting notes and rating system
10. Build search and filter functionality

### Sprint 3: Advanced Features (Week 3)
11. Create dashboard with statistics and reports
12. Implement drinking window suggestions
13. Integrate Claude API for food pairing feature
14. Build food pairing UI with text input and results display

### Sprint 4: Polish (Week 4)
15. Add error handling and loading states throughout app
16. Improve UI/UX and responsive design
17. Add data validation and form error handling
18. Testing and bug fixes

---

## Environment Configuration

### `.env.local` Template
```bash
# Supabase (from `npx supabase start` output)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key

# Claude API
VITE_CLAUDE_API_KEY=sk-ant-your-api-key

# Optional: Feature flags
VITE_ENABLE_REALTIME=false
```

---

## Migration to Cloud (Future)

When ready to deploy:

1. **Create Supabase Cloud Project**
   - Sign up at supabase.com
   - Create new project
   - Get production URL and keys

2. **Update Environment Variables**
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-production-anon-key
   ```

3. **Push Database Schema**
   ```bash
   npx supabase db push
   ```

4. **Deploy Frontend**
   - Vercel, Netlify, or any static host
   - Set environment variables in hosting platform

5. **Configure Storage Bucket**
   - Create `wine-images` bucket in Supabase
   - Set public access policies

---

## Testing Strategy

### Unit Tests
- Test utility functions
- Test data transformation logic

### Integration Tests
- Test Supabase queries
- Test Claude API integration
- Test search/filter logic

### E2E Tests (Optional)
- Critical user flows
- Add wine → Upload photo → Add tasting note
- Search and filter wines
- Get food pairing suggestions

---

## Security Considerations

1. **Row Level Security (RLS):** Ensure all tables have proper RLS policies
2. **API Keys:** Never commit `.env` files, use `.env.example` template
3. **Input Validation:** Validate all user inputs on client and server
4. **File Upload:** Restrict file types and sizes for photos
5. **Rate Limiting:** Consider rate limiting Claude API calls

---

## Next Steps

1. Review this plan
2. Set up development environment
3. Initialize project with Phase 1 setup
4. Create database migrations
5. Begin Sprint 1 development

---

**Last Updated:** 2026-01-03
**Status:** Planning Complete - Ready for Implementation
