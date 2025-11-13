/**
 * 🔧 Quick Fix Script - Clear Cache and Reload
 * 
 * Run this in browser console to clear i18n cache:
 * 
 * localStorage.clear();
 * sessionStorage.clear();
 * location.reload();
 */

// Or add this to your app
export const clearI18nCache = () => {
  // Clear all quiz settings
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('quiz_settings_') || key.startsWith('i18next')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Cleared i18n and quiz settings cache');
  window.location.reload();
};

// In browser console, run:
// localStorage.clear(); sessionStorage.clear(); location.reload();
