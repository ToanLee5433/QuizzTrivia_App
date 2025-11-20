/**
 * 🚀 Advanced AI Question Generator
 * Features:
 * - Generate from prompt (no file upload required)
 * - Support multiple question types (multiple, boolean, ordering, matching, fill_blanks, audio)
 * - Preview and edit before adding to quiz
 * - Better UI/UX with step-by-step flow
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  Loader2, 
  Brain,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Wand2,
  FileText,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { simpleAIService, SimpleAIConfig } from '../../../services/simpleAIService';
import { Question, QuestionType } from '../../../types';
import { FileUploadSection } from './FileUploadSection';

interface AdvancedAIGeneratorProps {
  onQuestionsGenerated: (questions: Question[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'input' | 'generating' | 'preview';

const QUESTION_TYPE_OPTIONS: { value: QuestionType; labelKey: string; iconKey: string }[] = [
  { value: 'multiple', labelKey: 'createQuiz.ai.types.multiple', iconKey: '📝' },
  { value: 'boolean', labelKey: 'createQuiz.ai.types.boolean', iconKey: '✓✗' },
  { value: 'short_answer', labelKey: 'createQuiz.ai.types.shortAnswer', iconKey: '✍️' },
  { value: 'checkbox', labelKey: 'createQuiz.ai.types.checkbox', iconKey: '☑️' },
  { value: 'ordering', labelKey: 'createQuiz.ai.types.ordering', iconKey: '🔢' },
  { value: 'matching', labelKey: 'createQuiz.ai.types.matching', iconKey: '🔗' },
  { value: 'fill_blanks', labelKey: 'createQuiz.ai.types.fillBlanks', iconKey: '___' },
];

export const AdvancedAIGenerator: React.FC<AdvancedAIGeneratorProps> = ({
  onQuestionsGenerated,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  
  const [step, setStep] = useState<Step>('input');
  const [inputMode, setInputMode] = useState<'prompt' | 'file'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState<SimpleAIConfig>({
    numQuestions: 5,
    difficulty: 'medium',
    language: 'vi',
    temperature: 0.7,
    questionTypes: ['multiple', 'boolean'],
    includeExplanations: true
  });
  
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    // Validate input based on mode
    if (inputMode === 'prompt') {
      const trimmedPromptValue = prompt.trim();
      if (!trimmedPromptValue) {
        toast.error(t('createQuiz.ai.errors.emptyPrompt'));
        return;
      }

      if (trimmedPromptValue.length < 10) {
        toast.error(t('createQuiz.ai.errors.promptTooShort'));
        return;
      }
    } else {
      // File mode
      if (!selectedFile) {
        toast.error(t('createQuiz.ai.errors.noFile'));
        return;
      }
    }

    // Validate numQuestions
    if (!config.numQuestions || config.numQuestions < 1 || config.numQuestions > 30) {
      toast.error('⚠️ Number of questions must be between 1-30');
      return;
    }

    setStep('generating');

    try {
      let result;
      
      if (inputMode === 'prompt') {
        const trimmedPromptValue = prompt.trim();
        result = await simpleAIService.generateFromPrompt(trimmedPromptValue, config);
      } else {
        // Generate from file
        if (!selectedFile) {
          toast.error(t('createQuiz.ai.errors.noFile'));
          setStep('input');
          return;
        }
        result = await simpleAIService.generateFromFile(selectedFile, config);
      }

      if (result.error) {
        toast.error(`${t('createQuiz.ai.errors.generationFailed')}: ${result.error}`);
        setStep('input');
        return;
      }

      if (result.questions.length === 0) {
        toast.error(t('createQuiz.ai.errors.noQuestions'));
        setStep('input');
        return;
      }

      setGeneratedQuestions(result.questions);
      setSelectedQuestions(new Set(result.questions.map(q => q.id)));
      setStep('preview');
      toast.success(t('createQuiz.ai.success', {
        count: result.questions.length
      }));
    } catch (error) {
      toast.error(t('createQuiz.ai.errors.unexpected'));
      console.error('AI Generation error:', error);
      setStep('input');
    }
  };

  const handleToggleQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleApplyQuestions = () => {
    const questionsToAdd = generatedQuestions.filter(q => selectedQuestions.has(q.id));
    
    if (questionsToAdd.length === 0) {
      toast.error(t('createQuiz.ai.errors.noSelection'));
      return;
    }

    onQuestionsGenerated(questionsToAdd);
    toast.success(t('createQuiz.ai.applied', {
      count: questionsToAdd.length
    }));
    handleClose();
  };

  const handleClose = () => {
    setPrompt('');
    setSelectedFile(null);
    setInputMode('prompt');
    setStep('input');
    setGeneratedQuestions([]);
    setSelectedQuestions(new Set());
    onClose();
  };

  const toggleQuestionType = (type: QuestionType) => {
    const currentTypes = config.questionTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    setConfig({ ...config, questionTypes: newTypes });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {t('createQuiz.ai.title', 'AI Question Generator')}
                </h2>
                <p className="text-white/90 text-sm mt-1">
                  {t('createQuiz.ai.subtitle', 'Generate questions from your prompt using AI')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {['input', 'generating', 'preview'].map((s, idx) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  step === s 
                    ? 'bg-white text-purple-600 shadow-lg scale-105' 
                    : step === 'preview' && idx < 2
                    ? 'bg-white/30 text-white'
                    : 'bg-white/10 text-white/70'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s ? 'bg-purple-600 text-white' : 'bg-white/20'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-sm font-semibold">
                    {t(`createQuiz.ai.steps.${s}`, s)}
                  </span>
                </div>
                {idx < 2 && <ArrowRight className="w-4 h-4 text-white/50" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Input Mode Toggle */}
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  <button
                    onClick={() => setInputMode('prompt')}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      inputMode === 'prompt'
                        ? 'bg-white dark:bg-gray-700 shadow-md text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" aria-hidden="true" />
                    {t('createQuiz.ai.inputMode.prompt', 'Text Prompt')}
                  </button>
                  <button
                    onClick={() => setInputMode('file')}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      inputMode === 'file'
                        ? 'bg-white dark:bg-gray-700 shadow-md text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    {t('createQuiz.ai.inputMode.file', 'Upload File')}
                  </button>
                </div>

                {/* Conditional Input: Prompt or File */}
                {inputMode === 'prompt' ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('createQuiz.ai.promptLabel', 'Enter your topic or content')}
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t('createQuiz.ai.promptPlaceholder', 'E.g., "Create questions about World War II, focusing on major battles and key figures"')}
                      className="w-full h-40 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white resize-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {t('createQuiz.ai.promptHint', 'Be specific for better results. Minimum 10 characters.')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('createQuiz.ai.fileLabel', 'Upload a file to analyze')}
                    </label>
                    <FileUploadSection
                      selectedFile={selectedFile}
                      onFileSelect={setSelectedFile}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {t('createQuiz.ai.fileHint', 'Upload an image, PDF, or document. AI will analyze and create questions.')}
                    </p>
                  </div>
                )}

                {/* Question Types */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    {t('createQuiz.ai.typesLabel', 'Question Types')}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {QUESTION_TYPE_OPTIONS.map(({ value, labelKey, iconKey }) => (
                      <button
                        key={value}
                        onClick={() => toggleQuestionType(value)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          (config.questionTypes || []).includes(value)
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{iconKey}</div>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {t(labelKey, value)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Config Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('createQuiz.ai.numQuestionsLabel', 'Number of Questions')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={config.numQuestions || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setConfig({ ...config, numQuestions: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setConfig({ ...config, numQuestions: num });
                          }
                        }
                      }}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white ${
                        config.numQuestions && (config.numQuestions < 1 || config.numQuestions > 30)
                          ? 'border-red-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {config.numQuestions && (config.numQuestions < 1 || config.numQuestions > 30) && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">⚠️ Must be 1-30</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('createQuiz.ai.difficultyLabel', 'Difficulty')}
                    </label>
                    <select
                      value={config.difficulty}
                      onChange={(e) => setConfig({ ...config, difficulty: e.target.value as SimpleAIConfig['difficulty'] })}
                      className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="easy">{t('difficulty.easy', 'Easy')}</option>
                      <option value="medium">{t('difficulty.medium', 'Medium')}</option>
                      <option value="hard">{t('difficulty.hard', 'Hard')}</option>
                      <option value="mixed">{t('difficulty.mixed', 'Mixed')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('createQuiz.ai.languageLabel', 'Language')}
                    </label>
                    <select
                      value={config.language}
                      onChange={(e) => setConfig({ ...config, language: e.target.value as 'vi' | 'en' })}
                      className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="vi">{t('language.vietnamese', 'Vietnamese')}</option>
                      <option value="en">{t('language.english', 'English')}</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="relative">
                  <Loader2 className="w-20 h-20 text-purple-600 animate-spin" />
                  <Sparkles className="w-10 h-10 text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-6">
                  {t('createQuiz.ai.generating', 'Generating Questions...')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mt-2 text-center max-w-md">
                  {t('createQuiz.ai.generatingHint', 'AI is analyzing your prompt and creating high-quality questions. This may take a moment.')}
                </p>
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    {t('createQuiz.ai.reviewTitle', 'Review Generated Questions')}
                  </h3>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedQuestions.size} / {generatedQuestions.length} {t('createQuiz.ai.selected', 'selected')}
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {generatedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className={`p-4 border-2 rounded-xl transition-all cursor-pointer ${
                        selectedQuestions.has(question.id)
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                      }`}
                      onClick={() => handleToggleQuestion(question.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedQuestions.has(question.id)
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}>
                          {selectedQuestions.has(question.id) ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-white">
                            {question.text}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              {question.type}
                            </span>
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                              {question.points} {t('createQuiz.points', 'pts')}
                            </span>
                            {question.difficulty && (
                              <span className={`px-2 py-1 rounded ${
                                question.difficulty === 'easy' 
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                  : question.difficulty === 'medium'
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                              }`}>
                                {t(`difficulty.${question.difficulty}`, question.difficulty)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            {step === 'input' && (
              <>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || prompt.trim().length < 10}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Wand2 className="w-5 h-5" />
                  {t('createQuiz.ai.generate', 'Generate Questions')}
                </button>
              </>
            )}

            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('input')}
                  className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('common.back', 'Back')}
                </button>
                <button
                  onClick={handleApplyQuestions}
                  disabled={selectedQuestions.size === 0}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {t('createQuiz.ai.addToQuiz', 'Add to Quiz')} ({selectedQuestions.size})
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
