import 'react-i18next'
import type common from '../locales/en/common.json'
import type dashboard from '../locales/en/dashboard.json'
import type wines from '../locales/en/wines.json'
import type pairing from '../locales/en/pairing.json'
import type auth from '../locales/en/auth.json'

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      dashboard: typeof dashboard
      wines: typeof wines
      wineries: typeof wineries
      pairing: typeof pairing
      auth: typeof auth
    }
  }
}
