import React from 'react';
import { useTranslation } from 'react-i18next';

const TestI18n: React.FC = () => {
  const { t, i18n } = useTranslation();

  console.log('🔍 i18n Test:', {
    language: i18n.language,
    isInitialized: i18n.isInitialized,
    hasCommonBundle: i18n.hasResourceBundle(i18n.language, 'common'),
    store: i18n.store.data,
    dashboardWelcome: t('dashboard.welcome', {name: 'Test'}),
    favoritesTitle: t('favorites.title'),
    quizSearchPlaceholder: t('quiz.searchPlaceholder')
  });

  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      left: '20px', 
      backgroundColor: 'lightblue',
      padding: '20px',
      border: '2px solid blue',
      zIndex: 9999
    }}>
      <h3>i18n Test Results:</h3>
      <p>Language: {i18n.language}</p>
      <p>Is Ready: {i18n.isInitialized ? 'Yes' : 'No'}</p>
      <p>Has Bundle: {i18n.hasResourceBundle(i18n.language, 'common') ? 'Yes' : 'No'}</p>
      <p>dashboard.welcome: "{t('dashboard.welcome', {name: 'Test'})}"</p>
      <p>favorites.title: "{t('favorites.title')}"</p>
      <p>quiz.searchPlaceholder: "{t('quiz.searchPlaceholder')}"</p>
    </div>
  );
};

export default TestI18n;
