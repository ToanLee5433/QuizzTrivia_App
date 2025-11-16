/**
 * 🎴 Flashcard Learning Page
 * 
 * Features:
 * - Convert quiz questions to flashcards
 * - Swipe gestures (left = hard, right = easy)
 * - Progress tracking
 * - Spaced repetition algorithm
 * - Offline support
 * - Full i18n
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz } from '../../quiz/types';
import { FlashCard as FlashCardComponent } from '../components/FlashCard';
import { SessionHeader } from '../components/SessionHeader';
import { ProgressStrip } from '../components/ProgressStrip';
import { ActionBar } from '../components/ActionBar';
import { EmptyState } from '../components/EmptyState';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface CardData {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: Date;
  nextReview?: Date;
  repetitions: number;
  reviewCount: number; // Số lần đã xem lại
}

const FlashcardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cards, setCards] = useState<CardData[]>([]);
  const [cardQueue, setCardQueue] = useState<CardData[]>([]); // Hàng đợi câu hỏi
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set()); // Câu đã nhớ (Easy)
  const [isFlipped, setIsFlipped] = useState(false);
  const [questionsProcessed, setQuestionsProcessed] = useState(0); // Số câu đã xử lý

  // Load quiz and convert to flashcards
  useEffect(() => {
    const loadQuiz = async () => {
      if (!id) return;

      try {
        const quizDoc = await getDoc(doc(db, 'quizzes', id));
        
        if (!quizDoc.exists()) {
          toast.error(t('flashcard.errors.quizNotFound', 'Quiz not found'));
          navigate('/quiz-list');
          return;
        }

        const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        setQuiz(quizData);

        // Convert questions to flashcards
        const flashcards: CardData[] = quizData.questions.map((q, index) => {
          // Get question text, prefer plain text over rich text
          let questionText = q.text || '';
          
          // If rich text exists and plain text is empty, strip HTML from rich text
          if (!questionText && q.richText) {
            questionText = q.richText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          
          return {
            id: q.id || `card-${index}`,
            question: questionText || 'No question',
            answer: getAnswerText(q),
            difficulty: quizData.difficulty || 'medium',
            repetitions: 0,
            reviewCount: 0
          };
        });

        // Shuffle cards for randomization
        const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
        setCards(shuffled);
        setCardQueue(shuffled);
      } catch (error) {
        console.error('Error loading quiz:', error);
        toast.error(t('flashcard.errors.loadFailed', 'Failed to load flashcards'));
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [id, navigate, t]);

  // Get answer text from question
  const getAnswerText = (question: any): string => {
    // Multiple choice, checkbox, image - find correct answer(s) from answers array
    if (question.type === 'multiple' || question.type === 'checkbox' || question.type === 'image') {
      const correctAnswers = question.answers?.filter((ans: any) => ans.isCorrect) || [];
      if (correctAnswers.length > 0) {
        return correctAnswers.map((ans: any) => ans.text || ans.richText).join(', ');
      }
    }
    
    // Boolean type
    if (question.type === 'boolean') {
      const correctAnswer = question.answers?.find((ans: any) => ans.isCorrect);
      return correctAnswer?.text || 'N/A';
    }
    
    // Short answer, fill blanks - use correctAnswer field
    if (question.type === 'short_answer' || question.type === 'fill_blanks') {
      return question.correctAnswer || 'N/A';
    }
    
    // Ordering - show correct order
    if (question.type === 'ordering' && question.orderingItems) {
      const sorted = [...question.orderingItems].sort((a: any, b: any) => a.correctOrder - b.correctOrder);
      return sorted.map((item: any) => item.text).join(' → ');
    }
    
    // Matching - show pairs
    if (question.type === 'matching' && question.matchingPairs) {
      return question.matchingPairs.map((pair: any) => `${pair.left} ↔ ${pair.right}`).join(', ');
    }
    
    // Fallback: try to find any correct answer
    const correctAnswer = question.answers?.find((ans: any) => ans.isCorrect);
    return correctAnswer?.text || correctAnswer?.richText || question.correctAnswer || 'N/A';
  };

  // Handle card rating with spaced repetition
  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (currentIndex >= cardQueue.length) return;
    
    const currentCard = cardQueue[currentIndex];
    if (!currentCard) return;

    // Tăng số câu đã xử lý
    const newQuestionsProcessed = questionsProcessed + 1;
    setQuestionsProcessed(newQuestionsProcessed);

    // Tổng số câu gốc
    const totalCards = cards.length;

    let scheduleAfter = 0;
    let shouldReview = false;

    switch (rating) {
      case 'easy':
        // Nhớ rồi - không review lại nữa
        setMasteredCards(prev => new Set([...prev, currentCard.id]));
        setCompletedCards(prev => new Set([...prev, currentCard.id]));
        break;

      case 'good':
        // Được - review lại sau 50% số câu
        scheduleAfter = Math.ceil(totalCards * 0.5);
        shouldReview = true;
        setCompletedCards(prev => new Set([...prev, currentCard.id]));
        break;

      case 'hard':
        // Khó - review lại sau 25% số câu
        scheduleAfter = Math.ceil(totalCards * 0.25);
        shouldReview = true;
        break;

      case 'again':
        // Quên - review lại sau 10% số câu
        scheduleAfter = Math.ceil(totalCards * 0.1);
        shouldReview = true;
        break;
    }

    // Tạo queue mới
    let newQueue = [...cardQueue];
    
    // Xóa câu hiện tại khỏi queue
    newQueue = newQueue.filter((_, idx) => idx !== currentIndex);

    // Nếu cần review lại, thêm vào vị trí tương lai
    if (shouldReview && scheduleAfter > 0) {
      const insertPosition = Math.min(currentIndex + scheduleAfter, newQueue.length);
      const updatedCard = {
        ...currentCard,
        reviewCount: currentCard.reviewCount + 1,
        lastReviewed: new Date()
      };
      newQueue.splice(insertPosition, 0, updatedCard);
    }

    setCardQueue(newQueue);

    // Check xem đã hoàn thành chưa
    if (newQueue.length === 0) {
      toast.success(t('flashcard.sessionComplete', 'Flashcard session completed!'));
      navigate(`/quiz/${id}/preview`);
      return;
    }

    // Reset flip state cho câu tiếp theo
    setIsFlipped(false);
    
    // Nếu currentIndex >= newQueue.length, giữ nguyên index (sẽ hiển thị câu cuối)
    if (currentIndex >= newQueue.length) {
      setCurrentIndex(newQueue.length - 1);
    }
    // Nếu không thì giữ nguyên index (sẽ hiển thị câu tiếp theo vì queue đã shift)
  };

  // Handle card flip
  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {t('flashcard.loading', 'Loading flashcards...')}
          </p>
        </div>
      </div>
    );
  }

  // No cards state
  if (cards.length === 0 || cardQueue.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(`/quiz/${id}/preview`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('common.back', 'Back')}
          </button>
          <EmptyState
            variant="noCards"
            title={t('flashcard.noCards', 'No flashcards available')}
            description={t('flashcard.noCardsDesc', 'This quiz has no questions to convert to flashcards.')}
            actionLabel={t('flashcard.backToQuiz', 'Back to Quiz')}
            onAction={() => navigate(`/quiz/${id}/preview`)}
          />
        </div>
      </div>
    );
  }

  const currentCard = cardQueue[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/quiz/${id}/preview`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('common.back', 'Back')}
          </button>

          <SessionHeader
            deckTitle={quiz?.title || t('flashcard.session', 'Flashcard Session')}
            cardsRemaining={cardQueue.length}
            totalCards={cards.length}
            elapsedTime={0}
            onPause={() => {}}
            onExit={() => navigate(`/quiz/${id}/preview`)}
          />
        </div>

        {/* Progress */}
        <div className="mb-6">
          <ProgressStrip
            current={masteredCards.size + completedCards.size}
            total={cards.length}
            results={[]}
          />
        </div>

        {/* Flashcard */}
        <div className="mb-6">
          <FlashCardComponent
            card={{
              id: currentCard.id,
              front: currentCard.question,
              back: currentCard.answer,
              deckId: id || '',
              difficulty: currentCard.difficulty,
              createdAt: new Date(),
              updatedAt: new Date()
            }}
            flipped={isFlipped}
            onFlip={handleFlip}
          />
        </div>

        {/* Action Bar */}
        <ActionBar
          onForgot={() => handleRate('again')}
          onHard={() => handleRate('hard')}
          onGood={() => handleRate('good')}
          onEasy={() => handleRate('easy')}
          disabled={!isFlipped}
        />

        {/* Instructions */}
        {!isFlipped && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('flashcard.clickToFlip', 'Click the card to reveal the answer')}
            </p>
          </div>
        )}

        {/* Review count indicator */}
        {currentCard.reviewCount > 0 && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('flashcard.reviewCount', 'Review {{count}} lần', { count: currentCard.reviewCount })}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium">
            <span>✓</span> {t('flashcard.stats.mastered', 'Đã nhớ')}: {masteredCards.size}
          </div>
          <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-medium">
            <span>📝</span> {t('flashcard.study.cardsRemaining', 'Còn lại')}: {cardQueue.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardPage;
