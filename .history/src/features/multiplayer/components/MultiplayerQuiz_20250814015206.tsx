import React, { useMemo, useRef, useState, useEffect } from 'react';
import { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface MultiplayerQuizProps {
  gameData: any;
  roomData: any;
  currentUserId: string;
  currentUserName: string;
  multiplayerService: MultiplayerServiceInterface | null;
}

const MultiplayerQuiz: React.FC<MultiplayerQuizProps> = ({
  gameData,
  roomData,
  // currentUserId,
  // currentUserName,
  multiplayerService
}) => {
  const [selected, setSelected] = useState<string | number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(() => gameData?.timePerQuestion ?? roomData?.settings?.timePerQuestion ?? 30);
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState<any>(null);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Get current question from gameData
  const currentQuestionIndex = gameData?.currentQuestionIndex || 0;
  const questions = gameData?.questions || [];
  
  // Debug the exact structure before processing
  console.log('🔍 Raw gameData.questions:', gameData?.questions);
  console.log('🔍 Questions array:', questions);
  console.log('🔍 Current index:', currentQuestionIndex);
  console.log('🔍 Raw question at index:', questions[currentQuestionIndex]);
  console.log('🔍 RoomData quiz:', roomData?.quiz);
  console.log('🔍 Selected quiz source:', {
    fromGameData: !!gameData?.questions?.length,
    fromRoomData: !!roomData?.quiz?.questions?.length,
    gameDataCount: gameData?.questions?.length || 0,
    roomDataCount: roomData?.quiz?.questions?.length || 0
  });
  
  const question = questions[currentQuestionIndex] || { 
    id: 'loading', 
    title: 'Loading question...', 
    options: ['Please wait...'],
    correct: 0
  };

  // Additional debug for question processing
  console.log('🔍 Processed question:', question);
  console.log('🔍 Question has title?', !!question.title);
  console.log('🔍 Question has options?', !!question.options);
  console.log('🔍 Options is array?', Array.isArray(question.options));

  // HOTFIX: If question data is corrupted, use fallback questions directly
  const fallbackQuestions = [
    {
      id: 'q1',
      title: 'What is the capital of Vietnam?',
      options: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hue'],
      correct: 1
    },
    {
      id: 'q2', 
      title: 'Which programming language is primarily used for web development?',
      options: ['Python', 'Java', 'JavaScript', 'C++'],
      correct: 2
    },
    {
      id: 'q3',
      title: 'What does HTML stand for?',
      options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink and Text Markup Language'],
      correct: 0
    }
  ];

  // Use fallback ONLY if absolutely no quiz data available
  let finalQuestion = question;
  
  // Check if we have real quiz data first
  const hasRealQuizData = (gameData?.questions && gameData.questions.length > 0) || 
                         (roomData?.quiz?.questions && roomData.quiz.questions.length > 0);
  
  if (!hasRealQuizData) {
    console.warn('🚨 No real quiz data found, using fallback questions');
    finalQuestion = fallbackQuestions[currentQuestionIndex] || fallbackQuestions[0];
  } else if (!question.title || !question.options || !Array.isArray(question.options) || question.options.length === 0) {
    // If we have quiz data but current question is corrupted, try to find valid one
    console.warn('🚨 Current question corrupted, looking for alternative from real data');
    const realQuestions = gameData?.questions || roomData?.quiz?.questions || [];
    const validQuestion = realQuestions.find((q: any) => q.title && q.options && Array.isArray(q.options) && q.options.length > 0);
    if (validQuestion) {
      finalQuestion = validQuestion;
      console.log('✅ Found valid question from real data:', validQuestion.id);
    } else {
      console.warn('⚠️ No valid questions in real data, using fallback');
      finalQuestion = fallbackQuestions[currentQuestionIndex] || fallbackQuestions[0];
    }
  }

  console.log('🎮 MultiplayerQuiz Debug:', {
    gameData,
    currentQuestionIndex,
    questions: questions.length,
    question: finalQuestion,
    roomData,
    gameDataStructure: gameData ? Object.keys(gameData) : 'No gameData',
    hasQuestions: Array.isArray(questions) && questions.length > 0,
    firstQuestion: questions[0] || 'No first question',
    questionTitle: finalQuestion?.title || 'No title',
    questionOptions: finalQuestion?.options || 'No options',
    optionsLength: finalQuestion?.options?.length || 0,
    // Enhanced debugging for question structure
    questionKeys: finalQuestion ? Object.keys(finalQuestion) : 'No question keys',
    rawQuestion: JSON.stringify(finalQuestion, null, 2),
    questionsArray: JSON.stringify(questions, null, 2)
  });

  // Reset state when question changes
  useEffect(() => {
    setSelected(null);
    setLocked(false);
    setShowResults(false);
    setQuestionResults(null);
    setNextQuestionCountdown(null);
    const initial = gameData?.timePerQuestion ?? roomData?.settings?.timePerQuestion ?? 30;
    setTimeLeft(initial);
    
    console.log('🔄 Question changed:', {
      questionId: finalQuestion?.id,
      timePerQuestion: initial,
      questionIndex: currentQuestionIndex,
      hasRealData: !!(gameData?.questions || roomData?.quiz?.questions)
    });
  }, [finalQuestion?.id, currentQuestionIndex, gameData?.timePerQuestion, roomData?.settings?.timePerQuestion, gameData?.questions, roomData?.quiz?.questions]);

  // Countdown timer
  useEffect(() => {
    if (locked || showResults) return;
    if (timeLeft <= 0) {
      if (!locked) handleSubmit();
      return;
    }
    timerRef.current = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [timeLeft, locked, showResults]);

  // Next question countdown
  useEffect(() => {
    if (nextQuestionCountdown === null) return;
    if (nextQuestionCountdown <= 0) {
      // Move to next question or finish game
      setShowResults(false);
      setNextQuestionCountdown(null);
      
      // Check if game should continue
      const isLastQuestion = currentQuestionIndex >= questions.length - 1;
      console.log('⏰ Question timer ended:', {
        currentQuestionIndex,
        totalQuestions: questions.length,
        isLastQuestion
      });
      
      if (isLastQuestion) {
        console.log('🏁 Game finished - no more questions');
      } else {
        console.log('➡️ Ready for next question');
        // The next question will be handled by room state updates
      }
      return;
    }
    const timer = setTimeout(() => {
      setNextQuestionCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [nextQuestionCountdown, currentQuestionIndex, questions.length]);

  const handleSelect = (answer: any) => {
    if (locked) return;
    setSelected(answer);
    
    // Auto-submit after selection (no manual submit button needed)
    setTimeout(() => {
      handleSubmit(answer);
    }, 500); // Small delay to show selection feedback
  };
  
  const handleSubmit = async (selectedAnswer?: any) => {
    const answerToSubmit = selectedAnswer !== undefined ? selectedAnswer : selected;
    if (locked) return;
    setLocked(true);
    
    if (!multiplayerService || !roomData?.id || !finalQuestion?.id) {
      console.warn('Cannot submit answer - missing data:', { 
        hasService: !!multiplayerService, 
        roomId: roomData?.id, 
        questionId: finalQuestion?.id 
      });
      return;
    }
    
    try {
      console.log('📝 Submitting answer:', { 
        questionId: finalQuestion.id, 
        selectedAnswer: answerToSubmit, 
        timeSpent: (gameData?.timePerQuestion ?? roomData?.settings?.timePerQuestion ?? 30) - timeLeft 
      });
      
      const timeSpent = (gameData?.timePerQuestion ?? roomData?.settings?.timePerQuestion ?? 30) - timeLeft;
      await multiplayerService.submitAnswer(roomData.id, finalQuestion.id, answerToSubmit, timeSpent);
      
      // Show results after 1 second
      setTimeout(() => {
        const isCorrect = answerToSubmit === finalQuestion.correct;
        const points = isCorrect ? Math.max(1, Math.floor(timeLeft / 2)) : 0; // More points for faster answers
        
        setQuestionResults({
          isCorrect,
          correctAnswer: finalQuestion.correct,
          selectedAnswer: answerToSubmit,
          points,
          explanation: finalQuestion.explanation || `Correct answer: ${finalQuestion.options?.[finalQuestion.correct]?.text || finalQuestion.options?.[finalQuestion.correct] || 'N/A'}`
        });
        setShowResults(true);
        // Remove client-side countdown - let server manage timing
        // setNextQuestionCountdown(5); // 5 seconds to next question
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      setLocked(false); // Allow retry on error
    }
  };

  const percent = useMemo(() => {
    const total = gameData?.timePerQuestion ?? roomData?.settings?.timePerQuestion ?? 30;
    return Math.max(0, Math.min(100, Math.round((timeLeft / total) * 100)));
  }, [timeLeft, gameData?.timePerQuestion, roomData?.settings?.timePerQuestion]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 p-2 sm:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base text-center">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className="flex items-center gap-2 text-gray-600 justify-center sm:justify-start">
                <Users size={18} />
                <span className="text-sm sm:text-base">{roomData?.players?.length || 0} players</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              {locked && (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-xl font-medium text-sm">
                  <CheckCircle size={16} />
                  <span>Answer Submitted!</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base ${
                  timeLeft <= 5 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Clock size={16} />
                  <span>{timeLeft}s</span>
                </div>
                
                <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                    <circle 
                      cx="18" cy="18" r="16" fill="none" 
                      stroke={timeLeft <= 5 ? "#ef4444" : "#3b82f6"}
                      strokeWidth="3" 
                      strokeLinecap="round"
                      strokeDasharray={`${percent} 100`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                      {percent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {timeLeft <= 10 && !locked && (
            <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-lg mb-4">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertCircle size={18} />
                <span className="font-medium">Hurry up! Only {timeLeft} seconds left!</span>
              </div>
            </div>
          )}
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
              <strong>🐛 Question Debug:</strong><br/>
              Question ID: {finalQuestion?.id || 'None'}<br/>
              Question Title: {finalQuestion?.title || 'None'}<br/>
              Options Count: {finalQuestion?.options?.length || 0}<br/>
              Question Index: {currentQuestionIndex}/{questions.length}<br/>
              <strong>Data Source:</strong> {gameData?.questions?.length ? 'GameData' : roomData?.quiz?.questions?.length ? 'RoomData' : 'Fallback'}<br/>
              <strong>Real Questions Available:</strong> {(gameData?.questions || roomData?.quiz?.questions || []).length}
            </div>
          )}
          
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4">
              {finalQuestion.title || 'No question available'}
            </h2>
            <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-purple-500 to-blue-600 mx-auto rounded-full"></div>
          </div>
          
          {/* Show message if no options */}
          {(!finalQuestion.options || finalQuestion.options.length === 0) && (
            <div className="text-center p-8 bg-gray-50 rounded-xl">
              <p className="text-gray-600">Waiting for question options to load...</p>
              <p className="text-sm text-gray-500 mt-2">
                Questions available: {questions.length} | Current index: {currentQuestionIndex}
              </p>
            </div>
          )}
          
          {/* Show options if available */}
          {finalQuestion.options && finalQuestion.options.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 mb-6 sm:mb-8">
              {(finalQuestion.options || []).map((opt: any, idx: number) => {
                const value = opt?.value ?? idx;
                const label = opt?.text ?? String(opt);
                const isSelected = selected === value;
                const optionLabels = ['A', 'B', 'C', 'D'];
                
                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(value)}
                    className={`group relative px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-left transition-all duration-200 transform hover:scale-105 ${
                      isSelected 
                        ? 'border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg' 
                        : 'border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    } ${locked ? 'opacity-60 cursor-not-allowed transform-none' : ''}`}
                    disabled={locked}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm ${
                        isSelected 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}>
                        {optionLabels[idx] || idx + 1}
                      </div>
                      <span className="font-medium text-gray-800 text-sm sm:text-base">{label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-red-100 p-4 rounded-lg">
              <p className="text-red-700">❌ No options available for this question</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-gray-500 text-center sm:text-left">
              {locked ? 'Answer submitted! Waiting for results...' : selected !== null ? 'Answer selected - Auto-submitting...' : 'Choose your answer'}
            </div>
            
            {locked && (
              <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-medium">
                <CheckCircle size={16} />
                <span>Submitted!</span>
              </div>
            )}
          </div>
        </div>

        {/* Question Results Modal */}
        {showResults && questionResults && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  questionResults.isCorrect 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {questionResults.isCorrect ? (
                    <CheckCircle size={40} />
                  ) : (
                    <AlertCircle size={40} />
                  )}
                </div>
                
                <h3 className={`text-2xl font-bold mb-2 ${
                  questionResults.isCorrect ? 'text-green-600' : 'text-red-600'
                }`}>
                  {questionResults.isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
                </h3>
                
                <div className="text-3xl font-bold text-blue-600 mb-4">
                  +{questionResults.points} points
                </div>
                
                <p className="text-gray-600 mb-4">
                  {questionResults.explanation}
                </p>
                
                {nextQuestionCountdown !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <Clock size={20} />
                      <span className="font-semibold">
                        Next question in {nextQuestionCountdown} seconds...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerQuiz;
