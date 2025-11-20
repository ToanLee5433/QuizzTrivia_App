import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizById, updateQuiz } from '../api';
import { Quiz } from '../types';
import { Question, QuizFormData } from './CreateQuizPage/types';
import QuestionEditor from './CreateQuizPage/components/QuestionEditor';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, Save, Loader2, Plus, 
  BookOpen, Target, MessageSquare, AlertCircle,
  FileText, Tag, Star, Clock, ImageIcon, Lock, Key
} from 'lucide-react';
import { db } from '../../../firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { useTranslation } from 'react-i18next';
import { categories, difficulties } from './CreateQuizPage/constants';
import RichTextEditor from '../../../shared/components/ui/RichTextEditor';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';
import ImageUploader from '../../../components/ImageUploader';
import { generateId } from './CreateQuizPage/utils';
import ResourcesStep from './CreateQuizPage/components/ResourcesStep';
import { LearningResource } from '../types/learning';

const EditQuizPageAdvanced: React.FC = () => {
  const { t } = useTranslation();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'resources' | 'settings'>('info');

  const [quizInfo, setQuizInfo] = useState<QuizFormData>({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    duration: 30,
    imageUrl: '',
    questions: [],
    tags: [],
    isPublic: true,
    allowRetake: true,
    havePassword: 'public',
    password: '',
    status: 'pending',
    quizType: 'standard',
    resources: []
  });

  const loadQuiz = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const quizData = await getQuizById(id);
      if (quizData) {
        setQuiz(quizData);
        setQuizInfo({
          title: quizData.title || '',
          description: quizData.description || '',
          category: quizData.category || '',
          difficulty: quizData.difficulty || '',
          duration: quizData.duration || 30,
          imageUrl: quizData.imageUrl || '',
          questions: quizData.questions || [],
          tags: quizData.tags || [],
          isPublic: quizData.isPublic !== false,
          allowRetake: quizData.allowRetake !== false,
          havePassword: (quizData.havePassword as any) || 'public',
          password: quizData.password || '',
          status: quizData.status || 'pending',
          // Keep quizType editable
          quizType: (quizData.quizType as any) || 'standard',
          resources: (quizData.resources as LearningResource[]) || []
        });
      } else {
        toast.error(t('editQuiz.notFound'));
        navigate('/creator/my');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error(t('editQuiz.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t, navigate]);

  useEffect(() => {
    if (id) loadQuiz();
  }, [id, loadQuiz]);

  const handleSave = async () => {
    if (!id || !quiz) return;

    if (!quizInfo.title.trim()) {
      toast.error(t('editQuiz.titleRequired'));
      return;
    }

    if (quizInfo.questions.length === 0) {
      toast.error(t('editQuiz.questionRequired'));
      return;
    }

    setSaving(true);
    try {
      const updatedQuiz: Quiz = {
        ...quiz,
        title: quizInfo.title,
        description: quizInfo.description,
        category: quizInfo.category,
        difficulty: quizInfo.difficulty as 'easy' | 'medium' | 'hard',
        duration: quizInfo.duration,
        imageUrl: quizInfo.imageUrl,
        questions: quizInfo.questions,
        tags: quizInfo.tags || [],
        isPublic: quizInfo.isPublic,
        allowRetake: quizInfo.allowRetake,
        havePassword: quizInfo.havePassword === 'password' ? 'password' : (typeof quizInfo.havePassword === 'boolean' ? quizInfo.havePassword : undefined),
        password: quizInfo.password,
        // Save quizType (now editable)
        quizType: quizInfo.quizType,
        // Save resources for with-materials quizzes
        resources: quizInfo.quizType === 'with-materials' ? (quizInfo.resources?.filter(r => ['image', 'video', 'pdf', 'link', 'slides'].includes(r.type)) as any || []) : [],
        updatedAt: new Date()
      };

      // ✅ HANDLE RESUBMISSION AFTER EDIT APPROVAL
      if (quiz.needsReApproval) {
        // Quiz was edited after admin approval, resubmit for approval
        updatedQuiz.status = 'pending';
        updatedQuiz.canEdit = false;
        updatedQuiz.isApproved = false;
        updatedQuiz.needsReApproval = false;
        updatedQuiz.resubmittedAt = new Date();
        
        // Create notification for admin about resubmission
        await addDoc(collection(db, 'notifications'), {
          userId: 'admin',
          type: 'quiz_resubmitted',
          title: t('editQuiz.notifications.resubmitted'),
          message: t('editQuiz.notifications.resubmittedMessage', { title: updatedQuiz.title }),
          quizId: id,
          createdBy: user?.uid,
          createdByName: user?.displayName || user?.email,
          createdAt: serverTimestamp(),
          read: false
        });
        
        toast.success(t('editQuiz.resubmitSuccess'));
      } else {
        toast.success(t('editQuiz.updateSuccess'));
      }

      await updateQuiz(id, updatedQuiz);
      navigate('/creator/my');
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error(t('editQuiz.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      text: '',
      type: 'multiple' as const,
      answers: [
        { id: generateId(), text: '', isCorrect: true },
        { id: generateId(), text: '', isCorrect: false },
        { id: generateId(), text: '', isCorrect: false },
        { id: generateId(), text: '', isCorrect: false }
      ],
      points: 1,
      correctAnswer: '',
      acceptedAnswers: []
    };
    // Add to beginning like CreateQuizPage
    setQuizInfo(prev => ({
      ...prev,
      questions: [newQuestion, ...prev.questions]
    }));
  };

  const deleteQuestion = (idx: number) => {
    if (window.confirm(t('editQuiz.confirmDeleteQuestion'))) {
      setQuizInfo(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== idx)
      }));
    }
  };

  const updateQuestion = (idx: number, q: Question) => {
    setQuizInfo(prev => ({
      ...prev,
      questions: prev.questions.map((item, i) => i === idx ? q : item)
    }));
  };

  // Move question function for future drag-and-drop feature
  // @ts-ignore - Reserved for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= quizInfo.questions.length) return;
    
    setQuizInfo(prev => {
      const newQuestions = [...prev.questions];
      const [moved] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, moved);
      return { ...prev, questions: newQuestions };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">{t('editQuiz.loading')}</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('editQuiz.notFoundTitle')}</h2>
          <p className="text-gray-600 mb-6">{t('editQuiz.notFoundDesc')}</p>
          <button
            onClick={() => navigate('/creator/my')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            {t('editQuiz.backToAdmin')}
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: t('editQuiz.tabs.info'), icon: BookOpen },
    { id: 'questions', label: t('editQuiz.tabs.questions'), icon: MessageSquare, count: quizInfo.questions.length },
    ...(quizInfo.quizType === 'with-materials' ? [
      { id: 'resources', label: t('editQuiz.tabs.resources', 'Learning Materials'), icon: FileText, count: quizInfo.resources?.length || 0 }
    ] : []),
    { id: 'settings', label: t('editQuiz.tabs.settings'), icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/creator/my')}
              className="p-3 text-gray-600 hover:text-gray-900 hover:bg-white rounded-2xl transition-all shadow-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('editQuiz.title')}
              </h1>
              <p className="text-gray-600 text-lg">{t('editQuiz.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 font-semibold"
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Save className="w-6 h-6" />
            )}
            {saving ? t('editQuiz.buttons.saving') : t('editQuiz.buttons.save')}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-2 bg-white/80 backdrop-blur-sm rounded-3xl p-2 shadow-lg border border-white/20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  {tab.label}
                  {'count' in tab && tab.count !== undefined && (
                    <span className={`px-3 py-1 text-sm rounded-full font-bold ${
                      activeTab === tab.id ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'info' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
              <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{t("createQuiz.info.basicInfo")}</h2>
                  <p className="text-gray-600">{t('editQuiz.editQuizInfo')}</p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FileText className="w-4 h-4" />{t("createQuiz.info.titleLabel")}
                    </label>
                    <input
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
                      placeholder={t("createQuiz.info.titlePlaceholder")}
                      value={quizInfo.title}
                      onChange={(e) => setQuizInfo({ ...quizInfo, title: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FileText className="w-4 h-4" />
                      {t('createQuiz.info.descriptionLabel')}
                    </label>
                    <RichTextEditor
                      value={quizInfo.description}
                      onChange={(value: string) => setQuizInfo({ ...quizInfo, description: value })}
                      placeholder={t('createQuiz.info.descriptionPlaceholder')}
                      height={200}
                    />
                  </div>

                  {/* Category & Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Tag className="w-4 h-4" />{t("createQuiz.info.categoryLabel")}
                      </label>
                      <select
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={quizInfo.category}
                        onChange={(e) => setQuizInfo({ ...quizInfo, category: e.target.value })}
                      >
                        <option value="">{t("createQuiz.info.categoryPlaceholder")}</option>
                        {categories.map(c => (
                          <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Star className="w-4 h-4" />{t("createQuiz.info.difficultyLabel")}
                      </label>
                      <select
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={quizInfo.difficulty}
                        onChange={(e) => setQuizInfo({ ...quizInfo, difficulty: e.target.value })}
                      >
                        <option value="">{t("createQuiz.info.difficultyPlaceholder")}</option>
                        {difficulties.map(d => (
                          <option key={d.value} value={d.value}>{t(d.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quiz Type (editable) */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <BookOpen className="w-4 h-4" />{t('quizCreation.quizType')}
                    </label>
                    <select
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={quizInfo.quizType || 'standard'}
                      onChange={(e) => setQuizInfo({ ...quizInfo, quizType: e.target.value as 'with-materials' | 'standard' })}
                    >
                      <option value="standard">{t('quizCreation.standard')}</option>
                      <option value="with-materials">{t('quizCreation.withMaterials')}</option>
                    </select>
                    <p className="text-sm text-gray-500">{t('quizCreation.quizTypeHint')}</p>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Clock className="w-4 h-4" />
                      {t('createQuiz.info.durationLabel')}
                    </label>
                    <input
                      type="number"
                      className={`w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors ${
                        quizInfo.duration && (quizInfo.duration < 5 || quizInfo.duration > 120)
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:border-blue-500'
                      }`}
                      min={5}
                      max={120}
                      value={quizInfo.duration || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setQuizInfo({ ...quizInfo, duration: '' as any });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setQuizInfo({ ...quizInfo, duration: num });
                          }
                        }
                      }}
                      placeholder={t('createQuiz.info.durationPlaceholder')}
                    />
                    {quizInfo.duration && (quizInfo.duration < 5 || quizInfo.duration > 120) ? (
                      <p className="text-sm text-red-600 mt-1">⚠️ {t('quizCreation.from5to120minutes')}</p>
                    ) : (
                      <p className="text-sm text-gray-500">{t('quizCreation.from5to120minutes')}</p>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Tag className="w-4 h-4" />
                      {t('quizCreation.tagsOptional')}
                    </label>
                    <input
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder={t('placeholders.enterTags')}
                      value={quizInfo.tags?.join(', ') || ''}
                      onChange={(e) => setQuizInfo({ 
                        ...quizInfo, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                      })}
                    />
                    <p className="text-sm text-gray-500">{t('quizCreation.tagsExample')}</p>
                  </div>

                  {/* Cover Image Upload */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <ImageIcon className="w-4 h-4" />
                      {t('quizCreation.coverImage')}
                    </label>
                    
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const uploadMode = document.getElementById('upload-mode');
                          const urlMode = document.getElementById('url-mode');
                          if (uploadMode && urlMode) {
                            uploadMode.classList.remove('hidden');
                            urlMode.classList.add('hidden');
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {t('quizCreation.uploadImage')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const uploadMode = document.getElementById('upload-mode');
                          const urlMode = document.getElementById('url-mode');
                          if (uploadMode && urlMode) {
                            uploadMode.classList.add('hidden');
                            urlMode.classList.remove('hidden');
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {t('quizCreation.enterUrl')}
                      </button>
                    </div>

                    <div id="upload-mode">
                      <ImageUploader
                        onUploadSuccess={(result) => {
                          if (result.success && result.originalUrl) {
                            setQuizInfo({ ...quizInfo, imageUrl: result.originalUrl! });
                          }
                        }}
                        onUploadError={(error) => {
                          console.error('Upload error:', error);
                        }}
                        options={{
                          folder: 'covers',
                          maxSizeKB: 3072,
                          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
                          generateThumbnails: true
                        }}
                        previewUrl={quizInfo.imageUrl || undefined}
                        label=""
                        showThumbnails={false}
                        compressBeforeUpload={true}
                        instantUpload={true}
                        ultraFast={true}
                      />
                    </div>

                    <div id="url-mode" className="hidden">
                      <input
                        type="url"
                        value={quizInfo.imageUrl || ''}
                        onChange={(e) => setQuizInfo({ ...quizInfo, imageUrl: e.target.value })}
                        placeholder={t('placeholders.imageUrl')}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      {quizInfo.imageUrl && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                          <img 
                            src={quizInfo.imageUrl} 
                            alt={t('createQuiz.info.previewImageAlt')} 
                            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      {t('quizCreation.coverImageHint')}
                    </p>
                  </div>

                  {/* Password Protection */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Lock className="w-4 h-4" />
                      {t('quizCreation.quizSecurity')}
                    </label>
                    
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                      <input
                        type="checkbox"
                        id="havePassword"
                        checked={quizInfo.havePassword === 'password'}
                        onChange={(e) => {
                          setQuizInfo({
                            ...quizInfo,
                            havePassword: e.target.checked ? 'password' : 'public',
                            password: e.target.checked ? quizInfo.password : ''
                          });
                        }}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <label htmlFor="havePassword" className="flex-1 cursor-pointer">
                        <div className="font-semibold text-purple-900 flex items-center gap-2">
                          {t('quizCreation.requirePassword')}
                        </div>
                        <p className="text-sm text-purple-700 mt-1">
                          {t('quizCreation.quizVisibleNeedPassword')}
                        </p>
                      </label>
                    </div>

                    {quizInfo.havePassword === 'password' && (
                      <div className="ml-4 space-y-2 animate-in fade-in duration-300">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Key className="w-4 h-4" />
                          {t('quizCreation.passwordRequired')}
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={quizInfo.password || ''}
                            onChange={(e) => setQuizInfo({ ...quizInfo, password: e.target.value })}
                            placeholder={t('placeholders.minPasswordLength')}
                            minLength={6}
                            className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                              quizInfo.password && quizInfo.password.length >= 6
                                ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                                : 'border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
                            }`}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {quizInfo.password && quizInfo.password.length >= 6 ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <Lock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {quizInfo.password && quizInfo.password.length < 6 && (
                          <p className="text-sm text-red-600 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-600 rounded-full" />
                            {t('quizCreation.passwordMinLength')}
                          </p>
                        )}
                        <p className="text-xs text-gray-600">
                          {t('quizCreation.passwordHint')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Additional Settings */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Star className="w-4 h-4" />
                      {t('quizCreation.additionalSettings')}
                    </label>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          id="allowRetake"
                          checked={quizInfo.allowRetake !== false}
                          onChange={(e) => setQuizInfo({ ...quizInfo, allowRetake: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="allowRetake" className="flex-1 cursor-pointer">
                          <div className="font-medium text-gray-900">{t('quizCreation.allowRetake')}</div>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {t('quizCreation.allowRetakeDesc')}
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3">📋 {t('createQuiz.info.preview')}</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>{t('createQuiz.info.previewLabels.title')}:</strong> {quizInfo.title || t('createQuiz.info.noTitle')}</p>
                      <div>
                        <strong>{t('createQuiz.info.previewLabels.description')}:</strong>{' '}
                        {quizInfo.description ? (
                          <RichTextViewer content={quizInfo.description} />
                        ) : (
                          <span>{t('createQuiz.info.noDescription')}</span>
                        )}
                      </div>
                      <p><strong>{t('createQuiz.info.previewLabels.category')}:</strong> {quizInfo.category ? t(`createQuiz.info.categoryOptions.${quizInfo.category}`) : t('createQuiz.info.noCategory')}</p>
                      <p><strong>{t('createQuiz.info.previewLabels.difficulty')}:</strong> {quizInfo.difficulty ? t(`difficulty.${quizInfo.difficulty as 'easy' | 'medium' | 'hard'}`) : t('createQuiz.info.noDifficulty')}</p>
                      <p><strong>{t('createQuiz.info.previewLabels.duration')}:</strong> {t('createQuiz.info.durationValue', { count: quizInfo.duration })}</p>
                      <p>
                        <strong>{t('createQuiz.info.previewLabels.privacy')}</strong>{' '}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                          quizInfo.isPublic === true 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {quizInfo.isPublic === true ? t('quizCreation.public') : t('quizCreation.private')}
                        </span>
                      </p>
                      <p>
                        <strong>{t('createQuiz.info.previewLabels.retake')}:</strong>{' '}
                        {quizInfo.allowRetake !== false ? t('createQuiz.info.retakeAllowed') : t('createQuiz.info.retakeDisabled')}
                      </p>
                      {quizInfo.tags && quizInfo.tags.length > 0 && (
                        <p><strong>{t('createQuiz.info.previewLabels.tags')}:</strong> {quizInfo.tags.join(', ')}</p>
                      )}
                      {quizInfo.imageUrl && (
                        <div className="mt-3">
                          <p><strong>{t('createQuiz.info.previewImage')}</strong></p>
                          <img src={quizInfo.imageUrl} alt={t('createQuiz.info.previewImageAlt')} className="mt-2 w-32 h-20 object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-gray-900">{t('editQuiz.questions')} ({quizInfo.questions.length})</h2>
                  <button
                    onClick={addQuestion}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-semibold"
                  >
                    <Plus className="w-6 h-6" />
                    {t('createQuiz.questions.addQuestion')}
                  </button>
                </div>
                {quizInfo.questions.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('editQuiz.noQuestions')}</h3>
                    <p className="text-gray-600 mb-8 text-lg">{t('editQuiz.noQuestionsDesc')}</p>
                    <button
                      onClick={addQuestion}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
                    >
                      {t('editQuiz.addFirstQuestion')}
                    </button>
                  </div>
                )}
              </div>

              {quizInfo.questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  onChange={(q) => updateQuestion(index, q)}
                  onDelete={() => deleteQuestion(index)}
                />
              ))}
            </div>
          )}

          {activeTab === 'resources' && quizInfo.quizType === 'with-materials' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('editQuiz.tabs.resources', 'Learning Materials')}</h2>
                <p className="text-gray-600">{t('editQuiz.resourcesDesc', 'Add videos, PDFs, images, or other learning materials for this quiz')}</p>
              </div>
              <ResourcesStep
                resources={quizInfo.resources || []}
                onResourcesChange={(resources) => setQuizInfo({ ...quizInfo, resources })}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">{t('editQuiz.quizSettings')}</h2>
              <div className="space-y-6">
                {/* Status */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Target className="w-4 h-4" />
                    {t("admin.preview.status")}
                  </label>
                  <div className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold ${
                      quizInfo.status === 'approved' ? 'bg-green-100 text-green-800' :
                      quizInfo.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      quizInfo.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quizInfo.status === 'draft' && t('quizCreation.draft')}
                      {quizInfo.status === 'pending' && t('quizCreation.pending')}
                      {quizInfo.status === 'approved' && t('quizCreation.approved')}
                      {quizInfo.status === 'rejected' && t('quizCreation.rejected')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {quizInfo.status === 'draft' && t('quizCreation.draftHint')}
                    {quizInfo.status === 'pending' && t('quizCreation.pendingHint')}
                    {quizInfo.status === 'approved' && t('quizCreation.approvedHint')}
                    {quizInfo.status === 'rejected' && t('quizCreation.rejectedHint')}
                  </p>
                  <p className="text-sm text-blue-600">
                    💡 {t('editQuiz.statusReadOnlyHint', 'Status is managed by admin and cannot be changed here')}
                  </p>
                </div>

                {/* Public/Private */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Lock className="w-4 h-4" />
                    {t('quizCreation.visibility')}
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={quizInfo.isPublic !== false}
                      onChange={(e) => setQuizInfo({ ...quizInfo, isPublic: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="isPublic" className="flex-1 cursor-pointer">
                      <div className="font-medium text-gray-900">{t('quizCreation.publicQuiz')}</div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {t('quizCreation.publicQuizDesc')}
                      </p>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuizPageAdvanced;
