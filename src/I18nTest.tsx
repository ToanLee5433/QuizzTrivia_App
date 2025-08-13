import React from 'react';
import { useTranslation } from 'react-i18next';

const I18nTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      backgroundColor: 'yellow',
      border: '3px solid red',
      padding: '20px',
      zIndex: 99999,
      maxWidth: '300px'
    }}>
      <h3>🧪 I18N TEST</h3>
      <p><strong>Lang:</strong> {i18n.language}</p>
      <p><strong>Ready:</strong> {i18n.isInitialized ? 'YES' : 'NO'}</p>
      
      <div style={{marginTop: '10px'}}>
        <div><strong>loading:</strong> "{t('loading')}"</div>
        <div><strong>favorites.title:</strong> "{t('favorites.title')}"</div>
        <div><strong>quiz.searchPlaceholder:</strong> "{t('quiz.searchPlaceholder')}"</div>
        <div><strong>or:</strong> "{t('or')}"</div>
      </div>
      
      <button 
        onClick={() => {
          const newLang = i18n.language === 'vi' ? 'en' : 'vi';
          i18n.changeLanguage(newLang);
        }}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          backgroundColor: 'blue',
          color: 'white',
          border: 'none',
          borderRadius: '3px'
        }}
      >
        Switch to {i18n.language === 'vi' ? 'EN' : 'VI'}
      </button>
    </div>
  );
};

export default I18nTest;
