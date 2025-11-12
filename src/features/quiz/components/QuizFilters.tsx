import React, { useState } from 'react';

import { useTranslation } from 'react-i18next';
interface QuizFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  categories: string[];
  difficulties: string[];
  totalQuizzes: number;
  filteredCount: number;
}

interface FilterOptions {
  search: string;
  category: string;
  difficulty: string;
  sortBy: string;
  showCompleted: boolean;
  tags: string[];
  minQuestions: number;
  maxDuration: number;
}

const QuizFilters: React.FC<QuizFiltersProps> = ({
  onFilterChange,
  categories,
  difficulties,
  totalQuizzes,
  filteredCount
}) => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'all',
    difficulty: 'all',
    sortBy: 'newest',
    showCompleted: true,
    tags: [],
    minQuestions: 0,
    maxDuration: 120
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      search: '',
      category: 'all',
      difficulty: 'all',
      sortBy: 'newest',
      showCompleted: true,
      tags: [],
      minQuestions: 0,
      maxDuration: 120
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      {/* Quick Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div className="text-sm text-gray-600">{t("profile.pagination.showing")} <span className="font-semibold text-blue-600">{filteredCount}</span> / {totalQuizzes} {t("quizList.results.quizzes")}
          </div>
          {filteredCount !== totalQuizzes && (
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >{t("quizList.empty.clearFilters")}
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
        >
          <span>{t(showAdvanced ? 'quizList.filter.hideAdvanced' : 'quizList.filter.showAdvanced')}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <input
            type="text"
            placeholder={t('placeholders.searchQuiz')}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Category */}
        <select 
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">{t("quizList.filters.allCategories")}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        {/* Difficulty */}
        <select 
          value={filters.difficulty}
          onChange={(e) => updateFilter('difficulty', e.target.value)}
          className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">{t("quizList.filters.allDifficulties")}</option>
          {difficulties.map(d => <option key={d} value={d}>
            {d === 'easy' ? '😊 Dễ' : d === 'medium' ? '😐 Trung bình' : '😤 Khó'}
          </option>)}
        </select>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Sort Options */}
            <select 
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">{t("quizList.sort.newest")}</option>
              <option value="oldest">{t("quizList.sort.oldest")}</option>
              <option value="popular">{t("quizList.sort.popular")}</option>
              <option value="difficulty">{t("quizList.sort.difficulty")}</option>
              <option value="questions">{t("quizList.sort.questions")}</option>
              <option value="duration">{t("quizList.sort.duration")}</option>
            </select>

            {/* Min Questions */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('quizList.filter.minQuestions', { count: filters.minQuestions })}</label>
              <input
                type="range"
                min="0"
                max="50"
                value={filters.minQuestions}
                onChange={(e) => updateFilter('minQuestions', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Max Duration */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('quizList.filter.maxDuration', { duration: filters.maxDuration })}</label>
              <input
                type="range"
                min="5"
                max="120"
                value={filters.maxDuration}
                onChange={(e) => updateFilter('maxDuration', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filters.showCompleted}
                onChange={(e) => updateFilter('showCompleted', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />{t("quizList.options.showCompleted")}
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizFilters;
