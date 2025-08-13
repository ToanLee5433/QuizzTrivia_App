import React from 'react';
import { useTranslation } from 'react-i18next';

const I18nDebugger: React.FC = () => {
  const { t, i18n } = useTranslation();

  const testKeys = [
    'favorites.title',
    'quiz.searchPlaceholder',
    'multiplayer.title',
    'multiplayer.createRoom',
    'common.loading'
  ];

  return (
    <div className="fixed top-4 right-4 bg-white p-4 border border-gray-300 rounded-lg shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-lg mb-2">🔍 i18n Debug v3.0</h3>
      <div className="text-sm">
        <p><strong>Language:</strong> {i18n.language}</p>
        <p><strong>Is Ready:</strong> {i18n.isInitialized ? '✅' : '❌'}</p>
        <p><strong>Resources Loaded:</strong> {i18n.hasResourceBundle(i18n.language, 'common') ? '✅' : '❌'}</p>
      </div>
      
      <div className="mt-3">
        <h4 className="font-semibold">Test Keys (No Fallback):</h4>
        {testKeys.map(key => {
          const value = t(key);
          const isFallback = value === key;
          return (
            <div key={key} className="text-xs border-b py-1">
              <span className="text-gray-600">{key}:</span>
              <br />
              <span className={isFallback ? "text-red-600" : "text-green-600"}>
                {isFallback ? '❌ MISSING' : '✅'} "{value}"
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 space-y-1">
        <button 
          onClick={() => {
            console.log('🔍 i18n Debug Info:');
            console.log('Resources:', i18n.store);
            console.log('VI Bundle:', i18n.getResourceBundle('vi', 'common'));
            console.log('EN Bundle:', i18n.getResourceBundle('en', 'common'));
          }}
          className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Log Debug Info
        </button>
        
        <button 
          onClick={() => {
            i18n.reloadResources(['vi', 'en'], ['common']).then(() => {
              console.log('✅ Resources reloaded');
              window.location.reload();
            });
          }}
          className="w-full px-2 py-1 bg-green-500 text-white rounded text-xs"
        >
          Force Reload Resources
        </button>
        
        <button 
          onClick={() => {
            localStorage.removeItem('i18nextLng');
            window.location.reload();
          }}
          className="w-full px-2 py-1 bg-red-500 text-white rounded text-xs"
        >
          Clear Cache & Reload
        </button>
      </div>
    </div>
  );
};

export default I18nDebugger;
