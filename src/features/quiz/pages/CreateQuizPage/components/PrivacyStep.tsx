import React, { useState } from 'react';
import { Globe, Lock, Eye, EyeOff, Share2, Key, Shield, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrivacyStepProps {
  privacy: 'public' | 'password';
  password?: string;
  onChange: (field: 'privacy' | 'password', value: string) => void;
}

const PrivacyStep: React.FC<PrivacyStepProps> = ({ privacy, password = '', onChange }) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordValid = privacy === 'password' ? (password && password.length >= 6) : true;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-block p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{t('quizCreation.accessSettings')}</h2>
        <p className="text-gray-600">{t('quizCreation.chooseAccessMethod')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Public Option */}
        <div 
          onClick={() => onChange('privacy', 'public')} 
          className={`cursor-pointer rounded-2xl p-6 transition-all transform hover:scale-105 ${
            privacy === 'public' 
              ? 'ring-4 ring-blue-500 ring-offset-2 shadow-2xl' 
              : 'ring-2 ring-gray-200 hover:ring-gray-300 shadow-md hover:shadow-xl'
          }`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('quizCreation.publicTitle')}</h3>
          <p className="text-sm text-gray-600 mb-4">{t('quizCreation.publicDesc')}</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>{t('quizCreation.visibleInList')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>{t('quizCreation.hasShareLink')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{t('quizCreation.noPasswordNeeded')}</span>
            </div>
          </div>
        </div>

        {/* Password Option */}
        <div 
          onClick={() => onChange('privacy', 'password')} 
          className={`cursor-pointer rounded-2xl p-6 transition-all transform hover:scale-105 ${
            privacy === 'password' 
              ? 'ring-4 ring-purple-500 ring-offset-2 shadow-2xl' 
              : 'ring-2 ring-gray-200 hover:ring-gray-300 shadow-md hover:shadow-xl'
          }`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('quizCreation.withPasswordTitle')}</h3>
          <p className="text-sm text-gray-600 mb-4">{t('quizCreation.withPasswordDesc')}</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-600" />
              <span>{t('quizCreation.visibleInList')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-600" />
              <span>{t('quizCreation.requirePasswordToTake')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-600" />
              <span>{t('quizCreation.shareLinkAndPassword')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Password Input */}
      {privacy === 'password' && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 animate-in fade-in duration-300">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{t('quizCreation.setPassword')}</h3>
              <p className="text-sm text-gray-600">{t('quizCreation.userNeedPasswordToTake')}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quizCreation.passwordRequired')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => onChange('password', e.target.value)}
                className={`w-full h-12 px-4 pr-12 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all ${
                  isPasswordValid 
                    ? 'border-gray-200 focus:border-purple-500' 
                    : 'border-red-300 focus:border-red-500'
                }`}
                placeholder={t('placeholders.minPasswordLength')}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {!isPasswordValid && password.length > 0 && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t('quizCreation.passwordMinLength')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-1">{t('quizCreation.shareLink')}</h4>
            <p className="text-sm text-blue-800">
              {privacy === 'public' 
                ? t('quizCreation.shareLinkDescriptionPublic')
                : t('quizCreation.shareLinkDescriptionPassword')
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyStep;
