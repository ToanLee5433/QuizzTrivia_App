import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../../config/routes';

/**
 * CreatorNav - Navigation component for creator section
 * Shows tabs for "My Quizzes" and "Create New Quiz"
 * Both bars follow the main Header's hide/show behavior
 */
const CreatorNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  
  // Check if we're on the create quiz page
  const isOnCreateQuizPage = location.pathname === ROUTES.CREATOR_NEW_QUIZ;

  // Sync with Header's hide/show behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 10;
      setHeaderVisible(isVisible);
      setPrevScrollPos(currentScrollPos);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <>
      {/* Back Button - Fixed, follows header */}
      <div 
        className={`fixed left-0 right-0 z-[90] bg-white border-b border-gray-200 transition-all duration-500 ${
          headerVisible 
            ? 'top-[56px] sm:top-[64px] lg:top-[72px]' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <NavLink
            to={isOnCreateQuizPage ? ROUTES.CREATOR_MY_QUIZZES : ROUTES.HOME}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">
              {isOnCreateQuizPage ? t('createQuiz.backToCreator') : t('creator.nav.backToHome')}
            </span>
          </NavLink>
        </div>
      </div>

      {/* Tab Navigation - Fixed, follows header */}
      <div 
        className={`fixed left-0 right-0 z-[90] bg-white border-b border-gray-200 shadow-sm transition-all duration-500 ${
          headerVisible 
            ? 'top-[100px] sm:top-[112px] lg:top-[120px]' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            <NavLink
              to={ROUTES.CREATOR_MY_QUIZZES}
              className={({ isActive }) =>
                `py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{t('creator.nav.myQuizzes')}</span>
            </NavLink>
            
            <NavLink
              to={ROUTES.CREATOR_NEW_QUIZ}
              className={({ isActive }) =>
                `py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{t('creator.nav.createQuiz')}</span>
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatorNav;
