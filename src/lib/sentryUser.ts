import * as Sentry from '@sentry/react'
import type { User } from '@supabase/supabase-js'

export function setSentryUser(user: User | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email, // Optional: remove for privacy
    })

    // Add user context as tags for filtering
    Sentry.setTag('auth.userId', user.id)
    Sentry.setTag('auth.provider', user.app_metadata?.provider || 'email')
  } else {
    Sentry.setUser(null)
  }
}
