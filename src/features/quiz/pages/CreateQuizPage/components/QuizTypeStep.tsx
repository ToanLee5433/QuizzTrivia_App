import React, { useMemo } from 'react';
import { BookOpen, Zap, GraduationCap, Target, Clock, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuizTypeStepProps {
  selectedType?: 'with-materials' | 'standard';
  onTypeSelect: (type: 'with-materials' | 'standard') => void;
}

const QuizTypeStep: React.FC<QuizTypeStepProps> = ({ selectedType, onTypeSelect }) => {
  const { t } = useTranslation();

  const quizTypes = useMemo(() => ([
    {
      id: 'with-materials' as const,
      icon: BookOpen,
      title: t('createQuiz.type.cards.withMaterials.title'),
      subtitle: t('createQuiz.type.cards.withMaterials.subtitle'),
      description: t('createQuiz.type.cards.withMaterials.description'),
      gradient: 'from-purple-500 via-pink-500 to-red-500',
      features: [
        { icon: GraduationCap, text: t('createQuiz.type.cards.withMaterials.features.learning') },
        { icon: Target, text: t('createQuiz.type.cards.withMaterials.features.progress') },
        { icon: TrendingUp, text: t('createQuiz.type.cards.withMaterials.features.completion') },
      ],
      badge: t('createQuiz.type.cards.withMaterials.badge'),
      badgeColor: 'bg-purple-500',
    },
    {
      id: 'standard' as const,
      icon: Zap,
      title: t('createQuiz.type.cards.standard.title'),
      subtitle: t('createQuiz.type.cards.standard.subtitle'),
      description: t('createQuiz.type.cards.standard.description'),
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      features: [
        { icon: Clock, text: t('createQuiz.type.cards.standard.features.speed') },
        { icon: Zap, text: t('createQuiz.type.cards.standard.features.focus') },
        { icon: Target, text: t('createQuiz.type.cards.standard.features.assessment') },
      ],
      badge: t('createQuiz.type.cards.standard.badge'),
      badgeColor: 'bg-blue-500',
    },
  ]), [t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          {t('createQuiz.type.headerTitle')}
        </h2>
        <p className="text-base leading-7 text-gray-600 max-w-2xl mx-auto">
          {t('createQuiz.type.headerSubtitle')}
        </p>
      </div>

      {/* Quiz Type Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {quizTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <button
              key={type.id}
              onClick={() => onTypeSelect(type.id)}
              className={`
                relative group text-left p-6 rounded-2xl border-2 transition-all duration-300
                ${isSelected
                  ? 'border-transparent shadow-2xl scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-[1.01]'
                }
              `}
            >
              {/* Background Gradient */}
              <div
                className={`
                  absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
                  bg-gradient-to-br ${type.gradient}
                  ${isSelected ? 'opacity-10' : 'group-hover:opacity-5'}
                `}
              />

              {/* Selected Border Gradient */}
              {isSelected && (
                <div
                  className={`
                    absolute inset-0 rounded-2xl bg-gradient-to-br ${type.gradient}
                    -z-10
                  `}
                />
              )}

              <div className="relative space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        bg-gradient-to-br ${type.gradient} text-white
                        shadow-lg transform transition-transform duration-300
                        ${isSelected ? 'scale-110 rotate-6' : 'group-hover:scale-105'}
                      `}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {type.title}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {type.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Badge */}
                  <span
                    className={`
                      ${type.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full
                      transform transition-transform duration-300
                      ${isSelected ? 'scale-110' : 'group-hover:scale-105'}
                    `}
                  >
                    {type.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm leading-6 text-gray-600">
                  {type.description}
                </p>

                {/* Features */}
                <div className="space-y-2 pt-2">
                  {type.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <FeatureIcon
                          className={`
                            w-4 h-4 flex-shrink-0
                            ${isSelected ? 'text-purple-600' : 'text-gray-400'}
                          `}
                        />
                        <span className="text-sm text-gray-700">{feature.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="pt-3 flex items-center gap-2 text-purple-600 font-semibold">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                    <span className="text-sm">{t('createQuiz.type.selected')}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">💡</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-gray-900">{t('createQuiz.type.tip.title')}</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>
                  • <strong>{t('createQuiz.type.tip.withMaterialsTitle')}</strong>{' '}
                  {t('createQuiz.type.tip.withMaterialsDescription')}
                </li>
                <li>
                  • <strong>{t('createQuiz.type.tip.standardTitle')}</strong>{' '}
                  {t('createQuiz.type.tip.standardDescription')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default QuizTypeStep;
