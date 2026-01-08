import React, { useEffect, useState, useCallback } from 'react';
import { Quiz } from '../types';
import QuizCard, { QuizCardSkeleton } from './QuizCard';
import { getRecommendations, clearRecommendationCache } from '../services/recommendation';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RecommendedSectionProps {
    userId: string;
    limit?: number;
    showRefresh?: boolean;
}

const RecommendedSection: React.FC<RecommendedSectionProps> = ({ 
    userId, 
    limit = 4,
    showRefresh = true 
}) => {
    const [recommendations, setRecommendations] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const fetchRecommendations = useCallback(async (forceRefresh = false) => {
        if (!userId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            if (forceRefresh) {
                clearRecommendationCache();
            }
            
            const data = await getRecommendations({ userId, limit });
            setRecommendations(data);
        } catch (err) {
            console.error('Failed to load recommendations:', err);
            setError(t('quiz.recommendations.error', 'Không thể tải gợi ý'));
        } finally {
            setLoading(false);
        }
    }, [userId, limit, t]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (mounted) {
                await fetchRecommendations();
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, [fetchRecommendations]);

    const handleStartQuiz = (quiz: Quiz) => {
        navigate(`/quiz/${quiz.id}`);
    };

    const handleRefresh = () => {
        fetchRecommendations(true);
    };

    // Don't render if no recommendations and not loading
    if (!loading && !error && recommendations.length === 0) {
        return null;
    }

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-pulse" />
                    <h2 className="text-2xl font-bold text-gray-900">
                        {t('quiz.recommendations.title', 'Gợi ý dành riêng cho bạn')}
                    </h2>
                </div>
                
                {showRefresh && !loading && (
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('quiz.recommendations.refresh', 'Làm mới gợi ý')}
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('quiz.recommendations.refresh', 'Làm mới')}</span>
                    </button>
                )}
            </div>

            {error ? (
                <div className="text-center py-8 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-red-600 mb-3">{error}</p>
                    <button
                        onClick={() => fetchRecommendations(true)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                        {t('common.retry', 'Thử lại')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loading
                        ? Array.from({ length: limit }).map((_, i) => (
                            <QuizCardSkeleton key={i} />
                        ))
                        : recommendations.map((quiz) => (
                            <QuizCard
                                key={quiz.id}
                                quiz={quiz}
                                viewMode="grid"
                                onStartQuiz={handleStartQuiz}
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

export default RecommendedSection;
