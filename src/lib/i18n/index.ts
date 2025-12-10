import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const CACHE_BUSTER = import.meta.env.DEV ? Date.now() : 1731754800000;
const LANGUAGE_KEY = 'i18nextLng';

// 🧹 Cleanup ALL i18n cache entries immediately on load
// File i18n đã quá lớn (~6000 dòng), không nên cache vào localStorage nữa
function cleanupI18nCache() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Only remove cache entries, NEVER remove language preference
      if (key?.startsWith('i18n_cache_')) {
        keysToRemove.push(key);
      }
    }
    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[i18n] Cleaned up ${keysToRemove.length} old cache entries`);
    }
  } catch (e) {
    console.warn('[i18n] Failed to cleanup cache:', e);
  }
}

// 🔥 Ensure language preference is preserved
// If no language is set, default to Vietnamese
function ensureLanguagePreference(): string {
  try {
    const savedLang = localStorage.getItem(LANGUAGE_KEY);
    // Only accept 'vi' or 'en', default to 'vi' for Vietnamese app
    if (savedLang === 'vi' || savedLang === 'en') {
      return savedLang;
    }
    // Default to Vietnamese if not set or invalid
    localStorage.setItem(LANGUAGE_KEY, 'vi');
    return 'vi';
  } catch (e) {
    return 'vi';
  }
}

// 🔥 Run cleanup immediately on module load to free up localStorage
cleanupI18nCache();

// Get the language to use (preserved or default)
const initialLanguage = ensureLanguagePreference();

// i18n configuration - using external locale files
// NOTE: We rely on browser HTTP cache, NOT localStorage cache (files too large)

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // 🔥 Set explicit language from preserved preference (defaults to 'vi')
    lng: initialLanguage,
    fallbackLng: 'vi',
    // Use common, multiplayer and feedback namespaces from external files
    ns: ['common', 'multiplayer', 'feedback'],
    defaultNS: 'common',
    
    detection: {
      // localStorage FIRST, then navigator as fallback
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_KEY,
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false // React already does escaping
    },

    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${CACHE_BUSTER}`,
      
      // 🔥 Use browser cache, NOT localStorage (files too large ~400KB+)
      requestOptions: {
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'default' // Browser handles caching efficiently
      }
      // NOTE: Removed custom request handler that cached to localStorage
      // Browser HTTP cache is sufficient and doesn't have quota limits
    },

    // Performance optimizations
    load: 'languageOnly',
    preload: ['vi', 'en'],
    
    // Debug mode in development (Vite)
    debug: import.meta.env.DEV,

    // Avoid Suspense requirement globally since not all trees are wrapped
    react: { useSuspense: false },

    // Avoid overriding runtime resources with fallback strings
    saveMissing: false
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

// Cache buster reference: 1731754800000 (prod fallback)
// Force reload external files only: 1731754800000
export default i18n;
