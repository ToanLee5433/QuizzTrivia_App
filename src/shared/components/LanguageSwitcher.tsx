import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark' | 'header';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'light' }) => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  // Styling based on variant
  const getButtonStyles = () => {
    switch (variant) {
      case 'dark': // For landing page with dark background
        return "flex items-center space-x-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm text-white";
      case 'header': // For authenticated header with white background
        return "flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300 text-gray-700";
      default: // Light variant - for login/register pages
        return "flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white shadow-md";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'dark':
        return "text-white";
      case 'header':
        return "text-gray-600";
      default:
        return "text-white";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'dark':
        return "text-white";
      case 'header':
        return "text-gray-700";
      default:
        return "text-white";
    }
  };

  const getArrowColor = () => {
    switch (variant) {
      case 'dark':
        return "text-white/70";
      case 'header':
        return "text-gray-500";
      default:
        return "text-white/80";
    }
  };

  return (
    <div className="relative group">
      <button className={getButtonStyles()}>
        <Globe className={`w-4 h-4 ${getIconColor()}`} />
        <span className={`${getTextColor()} text-sm font-medium hidden sm:inline`}>
          {currentLanguage.flag} {currentLanguage.name}
        </span>
        <span className={`${getTextColor()} text-sm font-medium sm:hidden`}>
          {currentLanguage.flag}
        </span>
        <svg className={`w-3 h-3 ${getArrowColor()} ml-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="px-3 py-2 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chọn ngôn ngữ</p>
        </div>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
              i18n.language === language.code ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {i18n.language === language.code && (
              <span className="text-blue-600 font-bold">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
