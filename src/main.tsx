import { initializeSentry } from './lib/sentry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import App from './App.tsx'
import './i18n/config'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'

const theme = createTheme({
  primaryColor: 'grape',
  colors: {
    grape: [
      '#f4e8f7',
      '#e5cde9',
      '#d5b2db',
      '#c597cd',
      '#b57cbf',
      '#a661b1',
      '#8b4e96',
      '#6f3b78',
      '#53285a',
      '#37153c',
    ],
  },
  defaultRadius: 'md',
})

// Initialize Sentry before React renders
initializeSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />
      <App />
    </MantineProvider>
  </StrictMode>,
)
