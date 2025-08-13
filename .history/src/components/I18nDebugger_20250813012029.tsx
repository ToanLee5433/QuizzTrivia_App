import React from 'react';
import { useTranslation } from 'react-i18next';

const I18nDebugger: React.FC = () => {
  const { t, i18n } = useTranslation();

  const testKeys = [
    'multiplayer.title',
    'multiplayer.createRoom',
    'multiplayer.features',
    'gameMode.multiplayer',
    'common.loading'
  ];

  return (
    <div className="fixed top-4 right-4 bg-white p-4 border border-gray-300 rounded-lg shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-lg mb-2">🔍 i18n Debug</h3>
      <div className="text-sm">
        <p><strong>Language:</strong> {i18n.language}</p>
        <p><strong>Is Ready:</strong> {i18n.isInitialized ? '✅' : '❌'}</p>
        <p><strong>Resources Loaded:</strong> {i18n.hasResourceBundle(i18n.language, 'common') ? '✅' : '❌'}</p>
      </div>
      
      <div className="mt-3">
        <h4 className="font-semibold">Test Keys:</h4>
        {testKeys.map(key => (
          <div key={key} className="text-xs border-b py-1">
            <span className="text-gray-600">{key}:</span>
            <br />
            <span className="text-blue-600">"{t(key, 'FALLBACK')}"</span>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => {
          console.log('i18n resources:', i18n.store);
          console.log('Available languages:', i18n.languages);
          console.log('Resource bundle VI:', i18n.getResourceBundle('vi', 'common'));
          console.log('Resource bundle EN:', i18n.getResourceBundle('en', 'common'));
        }}
        className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
      >
        Log Debug Info
      </button>
    </div>
  );
};

export default I18nDebugger;
