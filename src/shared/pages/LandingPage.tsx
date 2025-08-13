import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
            <span className="text-white text-lg sm:text-xl font-bold">Q</span>
          </div>
          <span className="text-white text-lg sm:text-xl font-bold">Quiz Trivia</span>
        </div>
        <LanguageSwitcher variant="dark" />
      </nav>

      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="text-center text-white max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight">
            {t('landing.hero.title')}
          </h1>
          
          <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto px-4 leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>
          
          <div className="flex flex-col gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Link
              to="/login"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {t('landing.cta.primary')}
            </Link>
            
            <Link
              to="/login"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-900 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200"
            >
              {t('landing.cta.secondary')}
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-8 sm:mt-12 lg:mt-16 px-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎯</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('landing.features.diversity.title')}</h3>
              <p className="text-blue-100 text-sm sm:text-base">
                {t('landing.features.diversity.description')}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">⏱️</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('landing.features.realtime.title')}</h3>
              <p className="text-blue-100 text-sm sm:text-base">
                {t('landing.features.realtime.description')}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🏆</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('landing.features.ranking.title')}</h3>
              <p className="text-blue-100 text-sm sm:text-base">
                {t('landing.features.ranking.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-8 sm:py-12 lg:py-16 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 text-center text-white">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-300 mb-1 sm:mb-2">1000+</div>
              <div className="text-blue-100 text-xs sm:text-sm lg:text-base">{t('landing.stats.quizzes')}</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-300 mb-1 sm:mb-2">10K+</div>
              <div className="text-blue-100 text-xs sm:text-sm lg:text-base">{t('landing.stats.players')}</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-indigo-300 mb-1 sm:mb-2">50K+</div>
              <div className="text-blue-100 text-xs sm:text-sm lg:text-base">{t('landing.stats.plays')}</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyan-300 mb-1 sm:mb-2">24/7</div>
              <div className="text-blue-100 text-xs sm:text-sm lg:text-base">{t('landing.stats.support')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-blue-200 py-4 sm:py-6 lg:py-8 px-4">
        <p>&copy; 2025 Quiz Trivia. {t('landing.footer.rights')}</p>
      </footer>
    </div>
  );
};
