import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/react'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Add Sentry instrumentation to Supabase client
supabase.auth.onAuthStateChange((event, session) => {
  Sentry.addBreadcrumb({
    category: 'auth',
    message: `Auth state changed: ${event}`,
    level: event === 'SIGNED_OUT' ? 'info' : 'debug',
    data: {
      event,
      userId: session?.user?.id,
    },
  })
})
