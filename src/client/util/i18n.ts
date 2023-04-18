import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '../locales/en.json'
import fi from '../locales/fi.json'
import sv from '../locales/sv.json'

declare global {
  interface Window {
    __i18n__: typeof i18n
  }
}

const initializeI18n = () =>
  i18n.use(initReactI18next).init({
    resources: {
      en,
      fi,
      sv,
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
  })

// eslint-disable-next-line
window.__i18n__ = i18n

export default initializeI18n
