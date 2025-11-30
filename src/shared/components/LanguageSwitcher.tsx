import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import ReactDOM from 'react-dom';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark' | 'header';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'light' }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, right: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8, // 8px margin
      right: window.innerWidth - rect.right,
    };
  };

  // Dropdown rendered via Portal to escape stacking context
  const renderDropdown = () => {
    if (!isOpen) return null;
    const pos = getDropdownPosition();
    
    return ReactDOM.createPortal(
      <div 
        ref={dropdownRef}
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-1 min-w-[180px] animate-fadeIn"
        style={{ 
          top: pos.top, 
          right: pos.right,
          zIndex: 99999,
        }}
      >
        <div className="px-3 py-2 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('common.selectLanguage')}</p>
        </div>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => {
              changeLanguage(language.code);
              setIsOpen(false);
            }}
            className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
              i18n.language === language.code ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {i18n.language === language.code && (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>,
      document.body
    );
  };

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={getButtonStyles()}
      >
        <Globe className={`w-4 h-4 ${getIconColor()}`} />
        <span className={`${getTextColor()} text-sm font-medium hidden sm:inline`}>
          {currentLanguage.flag} {currentLanguage.name}
        </span>
        <span className={`${getTextColor()} text-sm font-medium sm:hidden`}>
          {currentLanguage.flag}
        </span>
        <svg className={`w-3 h-3 ${getArrowColor()} ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {renderDropdown()}
    </div>
  );
};

export default LanguageSwitcher;
