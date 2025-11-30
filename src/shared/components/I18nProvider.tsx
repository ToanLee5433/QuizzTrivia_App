import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

const REQUIRED_NAMESPACE = 'common';

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { ready } = useTranslation(REQUIRED_NAMESPACE, { useSuspense: false });
  const [initialized, setInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      setInitialized(true);
      return;
    }

    const handleInitialized = () => {
      setInitialized(true);
    };

    i18n.on('initialized', handleInitialized);
    return () => {
      i18n.off('initialized', handleInitialized);
    };
  }, []);

  useEffect(() => {
    if (initialized && !ready) {
      i18n.loadNamespaces([REQUIRED_NAMESPACE]);
    }
  }, [initialized, ready]);

  if (!initialized || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading / Đang tải...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default I18nProvider;
