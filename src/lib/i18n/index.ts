import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// i18n configuration - using external locale files only

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Remove inline resources - will use external files only
    lng: 'vi', // default language
    fallbackLng: 'vi',
    // Use only common namespace from external files
    ns: ['common'],
    defaultNS: 'common',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false // React already does escaping
    },

    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=1731754800000`,
      addPath: '/locales/{{lng}}/{{ns}}.json'
    },

    // Performance optimizations
    load: 'languageOnly',
    preload: ['vi', 'en'],
    
    // Debug mode in development (Vite)
    debug: import.meta.env.DEV,

    // Avoid Suspense requirement globally since not all trees are wrapped
    react: { useSuspense: false },

    // Optionally record missing keys while developing
    saveMissing: import.meta.env.DEV
  });

// Helpful development logs for i18n lifecycle
if (import.meta.env.DEV) {
  i18n.on('initialized', (opts) => {
    // eslint-disable-next-line no-console
    console.log('i18n initialized', { lng: i18n.language, opts });
  });
  i18n.on('loaded', (loaded) => {
    // eslint-disable-next-line no-console
    console.log('i18n resources loaded', loaded);
  });
  i18n.on('languageChanged', (lng) => {
    // eslint-disable-next-line no-console
    console.log('i18n language changed to', lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  });
}

// Cache buster: 1731754800000 - Updated for quizOverview i18n fixes
// Force reload external files only: 1731754800000
export default i18n;