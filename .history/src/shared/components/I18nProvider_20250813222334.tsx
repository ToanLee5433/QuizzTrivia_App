import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(i18n.isInitialized);
  const { t } = useTranslation();

  useEffect(() => {
    if (i18n.isInitialized) {
      setIsReady(true);
      return;
    }

    const handleReady = () => {
      console.log('✅ i18n is ready');
      setIsReady(true);
    };

    // Listen for initialization
    i18n.on('initialized', handleReady);
    i18n.on('loaded', handleReady);

    // Cleanup
    return () => {
      i18n.off('initialized', handleReady);
      i18n.off('loaded', handleReady);
    };
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải ngôn ngữ...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default I18nProvider;
