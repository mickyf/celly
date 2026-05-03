# AI Wine Data Enrichment - Implementation Plan

## Overview
Add an "Enrich with AI" button to the wine detail page that uses Claude AI to automatically fill missing wine data (grapes, vintage, drinking window, winery) based on the wine name.

## User Requirements
- **UI Location**: Wine detail page (single wine enrichment)
- **Winery Logic**: Auto-create new wineries if they don't exist
- **Fields to Enrich**: Grapes, Drinking Window, Winery, Vintage (if missing)
- **Update Logic**: Only fill empty fields - preserve existing user data

---

## Implementation Steps

### 1. Create Claude API Function (`src/lib/claude.ts`)

**Add new interfaces and function:**

```typescript
export interface WineEnrichmentData {
  grapes?: string[]
  vintage?: number
  drinkingWindow?: {
    start: number
    end: number
  }
  winery?: {
    name: string
    countryCode: string  // ISO 3166-1 alpha-2
  }
  confidence: 'high' | 'medium' | 'low'
  explanation: string
}

export interface WineEnrichmentResponse {
  enrichmentData: WineEnrichmentData | null
  error?: string
}

export async function enrichWineData(
  wineName: string,
  existingVintage?: number | null
): Promise<WineEnrichmentResponse>
```

**Implementation details:**
- Follow same pattern as `getFoodPairing()` (API key validation, client instantiation)
- Model: `claude-sonnet-4-5-20250929`, max_tokens: 1024
- Prompt asks Claude to identify wine and return JSON with grape varieties, vintage, drinking window, winery name/country
- Instruct AI to include current year (2025) in drinking window calculations
- Request confidence level and explanation
- Validate country codes against `WINE_COUNTRIES` array from `src/constants/countries.ts`
- Validate drinking window: `start < end`
- Validate vintage: reasonable range (1800-2030)
- Use regex to extract JSON from response (handles markdown wrapping): `/\{[\s\S]*\}/`
- Return `{ enrichmentData: null, error: 'message' }` on failures

**Critical file:** `src/lib/claude.ts`

---

### 2. Create Enrichment Hook (`src/hooks/useWineEnrichment.ts`)

**New file with mutation hook:**

```typescript
export const useEnrichWine = () => {
  // Use existing hooks: useWineries(), useAddWinery(), useUpdateWine()

  return useMutation({
    mutationFn: async ({ wine }: { wine: Wine }) => {
      // 1. Check which fields are empty
      // 2. Call enrichWineData()
      // 3. Match/create winery (case-insensitive)
      // 4. Update wine with new data
      // 5. Return fieldsUpdated[] and wineryCreated flag
    },
    onSuccess: ({ fieldsUpdated, wineryCreated }) => {
      // Show detailed success notification
      // Invalidate queries: ['wines'], ['wineries']
    },
    onError: (error) => {
      // Show error notification
    }
  })
}
```

**Orchestration logic:**
1. **Pre-flight check**: Validate at least one field is empty (grapes, vintage, drink_window_start/end, winery_id)
2. **AI call**: `enrichWineData(wine.name, wine.vintage)`
3. **Confidence warning**: If `confidence === 'low'`, show yellow notification
4. **Winery matching**: Case-insensitive search in existing wineries
5. **Winery creation**: If no match and countryCode exists, call `useAddWinery()`
6. **Wine update**: Call `useUpdateWine()` with only empty fields
7. **Notifications**: Success with field count, winery created notice

**Critical file:** `src/hooks/useWineEnrichment.ts` (new file)

---

### 3. Update Wine Detail Page (`src/routes/wines/$id/index.tsx`)

**Add imports:**
```typescript
import { IconSparkles } from '@tabler/icons-react'
import { useEnrichWine } from '../../../hooks/useWineEnrichment'
```

**Add hook and handler (after line 59):**
```typescript
const enrichWine = useEnrichWine()

const handleEnrichWine = async () => {
  if (!wine) return
  await enrichWine.mutateAsync({ wine })
}

// Calculate if enrichment is possible
const canEnrich = wine && (
  !wine.grapes || wine.grapes.length === 0 ||
  wine.vintage === null ||
  wine.drink_window_start === null ||
  wine.drink_window_end === null ||
  wine.winery_id === null
)
```

**Add button in header group (modify around line 179):**
```typescript
<Group>
  {canEnrich && (
    <Button
      variant="gradient"
      gradient={{ from: 'grape', to: 'violet', deg: 90 }}
      leftSection={<IconSparkles size={20} />}
      onClick={handleEnrichWine}
      loading={enrichWine.isPending}
    >
      {t('wines:enrichment.button')}
    </Button>
  )}
  {/* Existing Edit and Delete buttons */}
</Group>
```

**Critical file:** `src/routes/wines/$id/index.tsx`

---

### 4. Add Translation Keys

**English (`src/locales/en/wines.json`)** - Add after "tastingNote" section:
```json
"enrichment": {
  "button": "Enrich with AI",
  "success": {
    "title": "Wine enriched",
    "message": "Updated {{count}} fields: {{fields}}"
  },
  "wineryCreated": {
    "title": "Winery created",
    "message": "A new winery was added to your collection"
  },
  "lowConfidence": {
    "title": "Low confidence identification",
    "message": "The AI was not highly confident in this identification. Please review the suggested data."
  },
  "errors": {
    "title": "Enrichment failed",
    "allFieldsFilled": "All fields already have data. Nothing to enrich.",
    "noData": "AI could not identify this wine. Try editing manually.",
    "noUpdates": "No fields were updated. The AI could not provide additional information."
  }
}
```

**Swiss German (`src/locales/de-CH/wines.json`)** - Same structure:
```json
"enrichment": {
  "button": "Mit KI anreichern",
  "success": {
    "title": "Wein angereichert",
    "message": "{{count}} Felder aktualisiert: {{fields}}"
  },
  "wineryCreated": {
    "title": "Weingut erstellt",
    "message": "Ein neues Weingut wurde zu Ihrer Sammlung hinzugefügt"
  },
  "lowConfidence": {
    "title": "Niedrige Identifikationssicherheit",
    "message": "Die KI war bei dieser Identifikation nicht sehr sicher. Bitte überprüfen Sie die vorgeschlagenen Daten."
  },
  "errors": {
    "title": "Anreicherung fehlgeschlagen",
    "allFieldsFilled": "Alle Felder enthalten bereits Daten. Nichts anzureichern.",
    "noData": "KI konnte diesen Wein nicht identifizieren. Versuchen Sie es manuell zu bearbeiten.",
    "noUpdates": "Keine Felder wurden aktualisiert. Die KI konnte keine zusätzlichen Informationen bereitstellen."
  }
}
```

**Critical files:**
- `src/locales/en/wines.json`
- `src/locales/de-CH/wines.json`

---

## Key Design Decisions

### Winery Matching Logic
- **Case-insensitive exact match**: `winery.name.toLowerCase() === aiName.toLowerCase()`
- **Create if missing**: Only when countryCode is valid (exists in `WINE_COUNTRIES`)
- **Skip if incomplete**: Don't create winery without valid country code

### Field Update Logic
```typescript
// Only update fields that are currently empty
if (needsGrapes && enrichmentData.grapes?.length > 0) {
  updateData.grapes = enrichmentData.grapes
}
if (needsVintage && enrichmentData.vintage) {
  updateData.vintage = enrichmentData.vintage
}
// etc...
```

### Error Handling
- **All fields filled**: Pre-flight check, show error before API call
- **Low confidence**: Show yellow warning notification with AI's explanation
- **Invalid data**: Validate country codes, drinking window ranges, vintage ranges
- **API errors**: Standard error notification with message

---

## Files Summary

### Files to Create (1)
- `src/hooks/useWineEnrichment.ts` - New enrichment mutation hook

### Files to Modify (4)
- `src/lib/claude.ts` - Add `enrichWineData()` function and interfaces
- `src/routes/wines/$id/index.tsx` - Add button, hook, and handler
- `src/locales/en/wines.json` - Add enrichment translation keys
- `src/locales/de-CH/wines.json` - Add enrichment translation keys

### No Database Changes Required
All fields already exist in the schema.

---

## Testing Checklist

- [ ] Well-known wine (e.g., "Château Margaux 2015") → all fields filled correctly
- [ ] Generic wine name (e.g., "Merlot") → low confidence warning shown
- [ ] Wine with all fields filled → button hidden or error shown
- [ ] Existing winery match → links to existing, no duplicate created
- [ ] New winery → auto-created with valid country code
- [ ] AI suggests invalid country → winery creation skipped
- [ ] Missing API key → clear error message
- [ ] Language switching → button text updates correctly
- [ ] Partial success → only available fields updated, success notification shows count
