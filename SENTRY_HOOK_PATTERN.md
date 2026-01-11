# Sentry Hook Enhancement Pattern

Apply this pattern to the remaining hooks that haven't been fully updated yet.

## Remaining Hooks to Update

1. ✅ **useWines.ts** - COMPLETED (all 5 functions done)
2. ✅ **useTastingNotes.ts** - COMPLETED (all 4 functions done)
3. ✅ **useWineries.ts** - COMPLETED (all 5 functions done)
4. ✅ **useStockMovements.ts** - COMPLETED (all 4 functions done)
5. ✅ **useFoodPairing.ts** - COMPLETED (1 function done)
6. ✅ **useWineEnrichment.ts** - COMPLETED (all 2 functions done with nested spans)
7. ✅ **useDashboard.ts** - COMPLETED (1 function done)

## Pattern for Mutations

```typescript
export const useSomeMutation = () => {
  const { t } = useTranslation(['namespace'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      // 1. Add breadcrumb BEFORE operation
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Doing operation',
        level: 'info',
        data: { /* relevant context */ },
      })

      // 2. Perform operation
      const { data: result, error } = await supabase
        .from('table')
        .insert(data)

      // 3. Capture error with context
      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'table_name',
            operation: 'insert|update|delete',
          },
          contexts: {
            supabase: {
              table: 'table_name',
              operation: 'insert|update|delete',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }

      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource'] })

      // 4. Add success breadcrumb
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Operation completed successfully',
        level: 'info',
      })

      // 5. Keep existing notification
      notifications.show({
        title: t('notifications.success.title'),
        message: t('notifications.success.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      // Error already captured in mutationFn, just show notification
      notifications.show({
        title: t('notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}
```

## Pattern for Queries

```typescript
export const useSomeQuery = (id?: string) => {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: async () => {
      // 1. Add breadcrumb
      Sentry.addBreadcrumb({
        category: 'data.query',
        message: 'Fetching resource',
        level: 'info',
        data: { id },
      })

      // 2. Perform query
      const { data, error } = await supabase
        .from('table')
        .select('*')

      // 3. Capture error
      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_query',
            table: 'table_name',
            operation: 'select',
          },
          contexts: {
            supabase: {
              table: 'table_name',
              operation: 'select',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }

      return data
    },
  })
}
```

## Quick Reference: What to Update

### For Each Hook File:

1. **Add import:**
   ```typescript
   import * as Sentry from '@sentry/react'
   ```

2. **For each query function:**
   - Add breadcrumb before query
   - Add error capture with context
   - Keep existing error throw

3. **For each mutation function:**
   - Add breadcrumb before operation
   - Add error capture with context
   - Add success breadcrumb in onSuccess
   - Keep existing notifications

## Example: Complete useTastingNotes.ts Mutations

```typescript
export const useAddTastingNote = () => {
  const { t } = useTranslation(['wines'])
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (note: NewTastingNote) => {
      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Adding tasting note',
        level: 'info',
        data: {
          wineId: note.wine_id,
          rating: note.rating,
          hasNotes: !!note.notes,
        },
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const error = new Error('Not authenticated')
        Sentry.captureException(error, {
          tags: {
            errorType: 'auth',
            operation: 'addTastingNote',
          },
        })
        throw error
      }

      const { data, error } = await supabase
        .from('tasting_notes')
        .insert({ ...note, user_id: user.id })
        .select()
        .single()

      if (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: 'supabase_mutation',
            table: 'tasting_notes',
            operation: 'insert',
          },
          contexts: {
            supabase: {
              table: 'tasting_notes',
              operation: 'insert',
              error_code: error.code,
              error_hint: error.hint,
            },
          },
        })
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasting_notes', data.wine_id] })
      queryClient.invalidateQueries({ queryKey: ['tasting_notes'] })

      Sentry.addBreadcrumb({
        category: 'data.mutation',
        message: 'Tasting note added successfully',
        level: 'info',
      })

      notifications.show({
        title: t('wines:notifications.noteAdded.title'),
        message: t('wines:notifications.noteAdded.message'),
        color: 'green',
      })
    },
    onError: (error) => {
      notifications.show({
        title: t('wines:notifications.error.title'),
        message: error.message,
        color: 'red',
      })
    },
  })
}
```

This pattern ensures consistent error tracking across all hooks!
