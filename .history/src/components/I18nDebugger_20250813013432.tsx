import React from 'react';
import { useTranslation } from 'react-i18next';

const I18nDebugger: React.FC = () => {
  const { t, i18n } = useTranslation();

  // Test the problematic keys
  const testFavorites = t('favorites.title');
  const testSearch = t('quiz.searchPlaceholder');

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'white',
      border: '2px solid red',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      zIndex: 9999,
      maxWidth: '350px',
      fontSize: '12px'
    }}>
      <div style={{backgroundColor: 'red', color: 'white', padding: '5px', marginBottom: '10px'}}>
        🔍 i18n Debug Panel
      </div>
      
      <div>
        <strong>Lang:</strong> {i18n.language}<br/>
        <strong>Ready:</strong> {i18n.isInitialized ? '✅' : '❌'}<br/>
        <strong>Resources:</strong> {i18n.hasResourceBundle(i18n.language, 'common') ? '✅' : '❌'}
      </div>
      
      <hr style={{margin: '10px 0'}}/>
      
      <div>
        <div style={{color: testFavorites === 'favorites.title' ? 'red' : 'green'}}>
          favorites.title: "{testFavorites}"
        </div>
        <div style={{color: testSearch === 'quiz.searchPlaceholder' ? 'red' : 'green'}}>
          quiz.searchPlaceholder: "{testSearch}"
        </div>
      </div>
      
      <hr style={{margin: '10px 0'}}/>
      
      <button 
        onClick={() => {
          console.log('🔍 DEBUG INFO:');
          console.log('Language:', i18n.language);
          console.log('Resources:', i18n.store.data);
          console.log('VI favorites:', i18n.getResourceBundle('vi', 'common')?.favorites);
          console.log('VI quiz:', i18n.getResourceBundle('vi', 'common')?.quiz);
          
          // Test direct access
          const viBundle = i18n.getResourceBundle('vi', 'common');
          console.log('Direct test:', {
            'favorites.title': viBundle?.favorites?.title,
            'quiz.searchPlaceholder': viBundle?.quiz?.searchPlaceholder
          });
        }}
        style={{width: '100%', padding: '8px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
      >
        Debug Log
      </button>
    </div>
  );
};

export default I18nDebugger;
