import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Video, Image as ImageIcon, Music, Link as LinkIcon, Presentation, Clock, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import RichTextViewer from '../../../../../shared/components/ui/RichTextViewer';
import SafeHTML from '../../../../../shared/components/ui/SafeHTML';
import { QuizFormData, Question } from '../types';
import { LearningResource } from '../../../types/learning';
import { VideoPlayer } from '../../../../../shared/components/ui/VideoPlayer';

interface ReviewStepProps {
  quiz: QuizFormData;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ quiz }) => {
  const { t } = useTranslation();

  const totalPoints = useMemo(
    () => quiz.questions.reduce((sum, q) => sum + q.points, 0),
    [quiz.questions]
  );

  const requiredResources = useMemo(
    () => (quiz.resources ?? []).filter((resource) => resource?.required),
    [quiz.resources]
  );

  const stripHtml = (value?: string) => (value || '').replace(/<\/?p>/gi, '').replace(/<[^>]*>/g, '').trim();

  const categoryLabel = quiz.category
    ? t(`createQuiz.info.categoryOptions.${quiz.category}`)
    : t('createQuiz.info.noCategory');

  const difficultyLabel = quiz.difficulty
    ? t(`difficulty.${quiz.difficulty as 'easy' | 'medium' | 'hard'}`)
    : t('createQuiz.info.noDifficulty');

  const privacyLabel = quiz.isPublic === true ? t('quizCreation.public') : t('quizCreation.private');
  const retakeLabel = quiz.allowRetake !== false ? t('createQuiz.info.retakeAllowed') : t('createQuiz.info.retakeDisabled');

  const questionTypeLabel = (type: Question['type']) => {
    switch (type) {
      case 'boolean':
        return t('quizCreation.trueFalse');
      case 'short_answer':
        return t('quizCreation.fillBlank');
      case 'image':
        return t('quizCreation.imageChoice');
      case 'audio':
        return t('quizCreation.audioQuestion', 'Audio');
      case 'video':
        return t('quizCreation.videoQuestion', 'Video');
      case 'multimedia':
        return t('quizCreation.multimediaQuestion', 'Multimedia');
      case 'checkbox':
        return t('quizCreation.multipleAnswers', 'Multiple Answers');
      case 'ordering':
        return t('quizCreation.orderingQuestion', 'Ordering');
      case 'matching':
        return t('quizCreation.matchingQuestion', 'Matching');
      case 'fill_blanks':
        return t('quizCreation.essayQuestion', 'Essay');
      default:
        return t('quizCreation.multipleChoice');
    }
  };

  const getResourceIcon = (type: LearningResource['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'link':
        return <LinkIcon className="w-4 h-4" />;
      case 'slides':
        return <Presentation className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getResourceBadgeColor = (type: LearningResource['type']) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pdf':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'image':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'audio':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'link':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'slides':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getResourceTypeLabel = (type: LearningResource['type']) => t(`resources.types.${type}`);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-blue-900 mb-4 text-xl flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          {t('createQuiz.review.sections.overview')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.title')}:</strong>
            <p className="text-gray-900 mt-1">{stripHtml(quiz.title) || t('createQuiz.info.noTitle')}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.category')}:</strong>
            <p className="text-gray-900 mt-1">{categoryLabel}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.difficulty')}:</strong>
            <p className="text-gray-900 mt-1">{difficultyLabel}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.duration')}:</strong>
            <p className="text-gray-900 mt-1">{t('createQuiz.info.durationValue', { count: quiz.duration })}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.questionCount')}:</strong>
            <p className="text-gray-900 mt-1">{t('createQuiz.review.questionCountValue', { count: quiz.questions.length })}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.totalPoints')}:</strong>
            <p className="text-gray-900 mt-1">{t('createQuiz.review.totalPointsValue', { count: totalPoints })}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.privacy')}:</strong>
            <p className="text-gray-900 mt-1">{privacyLabel}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.retake')}:</strong>
            <p className="text-gray-900 mt-1">{retakeLabel}</p>
          </div>
        </div>
        {quiz.description && (
          <div className="mt-4 bg-white/80 p-4 rounded-lg">
            <strong className="text-gray-700">{t('createQuiz.review.fields.description')}:</strong>
            <div className="mt-2 text-gray-900">
              <RichTextViewer content={quiz.description} />
            </div>
          </div>
        )}
      </div>

      {quiz.resources && quiz.resources.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-emerald-900 text-xl flex items-center gap-2">
              <FileText className="w-6 h-6" aria-hidden="true" />
              {t('createQuiz.review.sections.resources')}
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm font-bold">
                {t('createQuiz.review.resourceCountBadge', { count: quiz.resources.length })}
              </span>
              {requiredResources.length > 0 && (
                <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  {t('createQuiz.review.hasRequiredResources')}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {quiz.resources.map((resource, idx) => (
              <div
                key={resource.id ?? idx}
                className="bg-white rounded-xl p-4 border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl border-2 ${getResourceBadgeColor(resource.type)}`}>
                      {getResourceIcon(resource.type)}
                    </div>
                    <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-gray-900 text-lg leading-tight">{resource.title}</h4>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 flex-shrink-0 ${getResourceBadgeColor(resource.type)}`}>
                        {getResourceTypeLabel(resource.type)}
                      </span>
                    </div>

                    {resource.description && (
                      <SafeHTML content={resource.description} className="text-sm text-gray-600 mb-3 leading-relaxed" />
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {resource.required ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-bold border-2 border-red-300">
                          <AlertCircle className="w-4 h-4" aria-hidden="true" />
                          {t('createQuiz.review.requiredBadge')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-medium border border-gray-300">
                          {t('createQuiz.review.optionalBadge')}
                        </span>
                      )}
                      {resource.estimatedTime && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-200">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {t('resources.estimatedTime', { time: resource.estimatedTime })}
                        </span>
                      )}
                      {resource.whyWatch && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          {t('resources.whyWatch', { reason: resource.whyWatch })}
                        </span>
                      )}
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-sm hover:shadow-md"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          {t('createQuiz.review.viewResource')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {requiredResources.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <p className="text-sm text-amber-900 font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
                <span>{t('createQuiz.review.requiredNotice', { count: requiredResources.length })}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-gray-700" aria-hidden="true" />
          {t('createQuiz.review.sections.questions', { count: quiz.questions.length })}
        </h3>
        <div className="space-y-4">
          {quiz.questions.map((q, idx) => (
            <div
              key={q.id}
              className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white font-bold rounded-lg flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-base leading-tight mb-2">{q.text || t('createQuiz.review.emptyQuestionText')}</h4>
                    
                    {/* Question Media Preview */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {q.imageUrl && (
                        <div className="relative group">
                          <img src={q.imageUrl} alt="Question" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}
                      {q.audioUrl && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border-2 border-purple-200 rounded-lg">
                          <Music className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700">Audio</span>
                        </div>
                      )}
                      {q.videoUrl && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-2 border-red-200 rounded-lg">
                          <Video className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-semibold text-red-700">Video</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">
                    {questionTypeLabel(q.type)}
                  </span>
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200">
                    {t('createQuiz.review.pointsBadge', { count: q.points })}
                  </span>
                </div>
              </div>

              {q.type === 'short_answer' ? (
                <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <strong className="text-blue-900">{t('createQuiz.review.correctAnswerLabel')}</strong>{' '}
                  <span className="font-semibold">{q.correctAnswer || '-'}</span>
                  {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                    <div className="mt-1">
                      <strong className="text-blue-900">{t('createQuiz.review.acceptedVariationsLabel')}</strong>{' '}
                      {q.acceptedAnswers.slice(1).join(', ')}
                    </div>
                  )}
                </div>
              ) : q.type === 'ordering' ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 mb-2">{t('createQuiz.review.orderingInstruction', 'Drag to arrange in correct order:')}</div>
                  {q.orderingItems?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-600 text-white font-bold rounded-full flex-shrink-0">
                        {item.correctOrder}
                      </span>
                      <div className="flex-1">
                        <span className="text-gray-900">{item.text}</span>
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.text} className="w-20 h-20 object-cover rounded-lg mt-2 border-2 border-white shadow-sm" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : q.type === 'matching' ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 mb-2">{t('createQuiz.review.matchingInstruction', 'Match pairs:')}</div>
                  {q.matchingPairs?.map((pair) => (
                    <div key={pair.id} className="flex items-center gap-4 p-3 bg-teal-50 border-2 border-teal-200 rounded-lg">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-bold text-teal-700">Left:</span>
                        {pair.leftImageUrl ? (
                          <img src={pair.leftImageUrl} alt={pair.left} className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm" />
                        ) : (
                          <span className="text-gray-900">{pair.left}</span>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-bold text-teal-700">Right:</span>
                        {pair.rightImageUrl ? (
                          <img src={pair.rightImageUrl} alt={pair.right} className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm" />
                        ) : (
                          <span className="text-gray-900">{pair.right}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : q.type === 'fill_blanks' ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-3">
                    <strong className="text-yellow-900">{t('createQuiz.review.textWithBlanks', 'Text with blanks:')}</strong>
                    <div className="mt-2 font-mono text-sm">{q.textWithBlanks}</div>
                  </div>
                  {q.blanks?.map((blank) => (
                    <div key={blank.id} className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                      <span className="font-bold text-yellow-700">Blank {blank.position}:</span>
                      <span className="text-gray-900">{blank.correctAnswer}</span>
                      {blank.acceptedAnswers && blank.acceptedAnswers.length > 0 && (
                        <span className="text-gray-600 text-xs">({blank.acceptedAnswers.join(', ')})</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {q.answers.map((a, aidx) => (
                    <div
                      key={a.id}
                      className={`text-sm p-3 rounded-lg font-medium transition-colors ${
                        a.isCorrect
                          ? 'bg-green-100 text-green-800 border-2 border-green-300'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold ${
                            a.isCorrect ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          {String.fromCharCode(65 + aidx)}
                        </span>
                        <span className="flex-1">{a.text || <span className="italic text-gray-400">(No text)</span>}</span>
                        {a.isCorrect && <span className="ml-auto text-green-600 font-bold">{t('createQuiz.review.correctBadge')}</span>}
                      </div>
                      
                      {/* Show media for image, audio, video, or multimedia types */}
                      {(q.type === 'image' || q.type === 'multimedia') && a.imageUrl && (
                        <div className="mt-2">
                          <img
                            src={a.imageUrl}
                            alt={a.text || 'Answer image'}
                            className="w-32 h-32 object-cover rounded-lg border-2 border-white shadow-sm"
                          />
                        </div>
                      )}
                      {(q.type === 'audio' || q.type === 'multimedia') && a.audioUrl && (
                        <div className="mt-2">
                          <audio controls className="w-full max-w-xs">
                            <source src={a.audioUrl} />
                          </audio>
                        </div>
                      )}
                      {(q.type === 'video' || q.type === 'multimedia') && a.videoUrl && (
                        <div className="mt-2">
                          <VideoPlayer 
                            url={a.videoUrl} 
                            className="w-full max-w-xs rounded-lg" 
                            style={{ maxHeight: '150px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {q.explanation && (
                <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                  <strong className="text-amber-900 text-sm">{t('createQuiz.review.explanationLabel')}</strong>
                  <SafeHTML content={q.explanation} className="text-sm text-amber-800 mt-1" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;
