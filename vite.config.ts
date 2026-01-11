import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),

    // Sentry plugin (only in production builds)
    process.env.NODE_ENV === 'production' &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,

        sourcemaps: {
          assets: './dist/**',
          ignore: ['node_modules'],
        },

        release: {
          name: process.env.VITE_SENTRY_RELEASE || 'development',
          setCommits: {
            auto: true,
          },
        },

        disable: process.env.NODE_ENV !== 'production',
      }),
  ].filter(Boolean),

  build: {
    sourcemap: true, // Generate source maps for Sentry
  },
})
