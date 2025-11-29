import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const CACHE_BUSTER = import.meta.env.DEV ? Date.now() : 1731754800000;

// 🧹 Cleanup old i18n cache entries when localStorage is full
function cleanupI18nCache() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('i18n_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[i18n] Cleaned up ${keysToRemove.length} old cache entries`);
  } catch (e) {
    console.warn('[i18n] Failed to cleanup cache:', e);
  }
}

// i18n configuration - using external locale files with offline support

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Remove inline resources - will use external files only
    // Don't set lng here - let LanguageDetector handle it from localStorage
    fallbackLng: 'vi',
    // Use common and multiplayer namespaces from external files
    ns: ['common', 'multiplayer'],
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
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${CACHE_BUSTER}`,
      addPath: '/locales/{{lng}}/{{ns}}.json',
      
      // 🔥 CRITICAL: Add request options for offline support
      requestOptions: {
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'default' // Use browser cache when available
      },
      
      // 🔥 Custom loader with offline fallback
      request: async (options: any, url: string, _payload: any, callback: any) => {
        try {
          // Try normal fetch first
          const response = await fetch(url, {
            method: options.method || 'GET',
            mode: 'cors',
            credentials: 'same-origin',
            cache: 'default' // Use cache-first strategy
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          
          // Cache in localStorage as backup
          const cacheKey = `i18n_cache_${url}`;
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (e: any) {
            // 🧹 If localStorage is full, cleanup old entries and retry
            if (e?.name === 'QuotaExceededError') {
              cleanupI18nCache();
              try {
                localStorage.setItem(cacheKey, JSON.stringify(data));
              } catch {
                // Still failed, just skip caching
              }
            }
          }
          
          callback(null, { status: 200, data });
        } catch (error) {
          console.warn(`[i18n] Failed to fetch ${url}, trying localStorage cache...`);
          
          // Fallback to localStorage cache
          const cacheKey = `i18n_cache_${url}`;
          const cached = localStorage.getItem(cacheKey);
          
          if (cached) {
            try {
              const data = JSON.parse(cached);
              console.log(`[i18n] Using cached translation for ${url}`);
              callback(null, { status: 200, data });
            } catch (e) {
              callback(error, { status: 500, data: null });
            }
          } else {
            callback(error, { status: 500, data: null });
          }
        }
      }
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