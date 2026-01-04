import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enCommon from '../locales/en/common.json'
import enDashboard from '../locales/en/dashboard.json'
import enWines from '../locales/en/wines.json'
import enWineries from '../locales/en/wineries.json'
import enPairing from '../locales/en/pairing.json'
import enAuth from '../locales/en/auth.json'

import deCommon from '../locales/de-CH/common.json'
import deDashboard from '../locales/de-CH/dashboard.json'
import deWines from '../locales/de-CH/wines.json'
import deWineries from '../locales/de-CH/wineries.json'
import dePairing from '../locales/de-CH/pairing.json'
import deAuth from '../locales/de-CH/auth.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        dashboard: enDashboard,
        wines: enWines,
        wineries: enWineries,
        pairing: enPairing,
        auth: enAuth,
      },
      'de-CH': {
        common: deCommon,
        dashboard: deDashboard,
        wines: deWines,
        wineries: deWineries,
        pairing: dePairing,
        auth: deAuth,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  })

export default i18n
