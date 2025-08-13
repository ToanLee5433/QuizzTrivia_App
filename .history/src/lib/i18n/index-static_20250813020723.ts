import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import JSON files directly
import { viCommon, enCommon } from '../../locales/resources';

console.log('🔍 Loading i18n with static resources...');
console.log('VI keys:', Object.keys(viCommon).length);
console.log('EN keys:', Object.keys(enCommon).length);

// Static resources
const resources = {
  vi: {
    common: viCommon
  },
  en: {
    common: enCommon
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'vi', // default language (Vietnamese)
    fallbackLng: 'en',
    
    // Use static resources instead of HTTP backend
    resources,
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    // Configure namespaces
    ns: ['common'],
    defaultNS: 'common',
    
    // Debug in development
    debug: true,
    
    // Configure loading behavior
    load: 'languageOnly',
    cleanCode: true,
    
    react: {
      useSuspense: false
    }
  });

// Test the loaded resources
i18n.on('initialized', () => {
  console.log('✅ i18n initialized with static resources');
  console.log('VI favorites.title:', i18n.getResource('vi', 'common', 'favorites.title'));
  console.log('EN favorites.title:', i18n.getResource('en', 'common', 'favorites.title'));
  console.log('VI quiz.searchPlaceholder:', i18n.getResource('vi', 'common', 'quiz.searchPlaceholder'));
  console.log('EN quiz.searchPlaceholder:', i18n.getResource('en', 'common', 'quiz.searchPlaceholder'));
});

export default i18n;
