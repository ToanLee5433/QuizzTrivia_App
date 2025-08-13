import React from 'react';
import { useTranslation } from 'react-i18next';

const SimpleI18nTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  // Direct console log to see what's happening
  React.useEffect(() => {
    console.log('🔍 SimpleI18nTest mounted');
    console.log('🔍 i18n language:', i18n.language);
    console.log('🔍 i18n isInitialized:', i18n.isInitialized);
    console.log('🔍 i18n store:', i18n.store);
    console.log('🔍 Has VI bundle:', i18n.hasResourceBundle('vi', 'common'));
    console.log('🔍 VI bundle data:', i18n.getResourceBundle('vi', 'common'));
    
    // Test specific keys
    console.log('🔍 Test dashboard.welcome:', t('dashboard.welcome', {name: 'TestUser'}));
    console.log('🔍 Test favorites.title:', t('favorites.title'));
    console.log('🔍 Test quiz.searchPlaceholder:', t('quiz.searchPlaceholder'));
  }, [t, i18n]);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      backgroundColor: 'yellow',
      padding: '20px',
      border: '3px solid red',
      zIndex: 99999,
      maxWidth: '400px'
    }}>
      <h3>🔍 i18n Test Results</h3>
      <p><strong>Language:</strong> {i18n.language}</p>
      <p><strong>Ready:</strong> {i18n.isInitialized ? 'YES' : 'NO'}</p>
      <p><strong>Has Bundle:</strong> {i18n.hasResourceBundle('vi', 'common') ? 'YES' : 'NO'}</p>
      
      <hr />
      
      <p><strong>dashboard.welcome:</strong></p>
      <p>"{t('dashboard.welcome', {name: 'TestUser'})}"</p>
      
      <p><strong>favorites.title:</strong></p>
      <p>"{t('favorites.title')}"</p>
      
      <p><strong>quiz.searchPlaceholder:</strong></p>
      <p>"{t('quiz.searchPlaceholder')}"</p>
      
      <hr />
      
      <button onClick={() => {
        console.log('🔍 Manual test clicked');
        console.log('Current store:', i18n.store.data);
      }}>
        Log Store Data
      </button>
    </div>
  );
};

export default SimpleI18nTest;
