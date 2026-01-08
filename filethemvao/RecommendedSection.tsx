
import React, { useEffect, useState } from 'react';
import { Quiz } from '../types';
import QuizCard, { QuizCardSkeleton } from './QuizCard';
import { getRecommendations } from '../services/recommendation';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface RecommendedSectionProps {
    userId: string;
}

const RecommendedSection: React.FC<RecommendedSectionProps> = ({ userId }) => {
    const [recommendations, setRecommendations] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        const fetchRecommendations = async () => {
            try {
                setLoading(true);
                const data = await getRecommendations({ userId });
                if (mounted) {
                    setRecommendations(data);
                }
            } catch (error) {
                console.error('Failed to load recommendations:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        if (userId) {
            fetchRecommendations();
        }

        return () => {
            mounted = false;
        };
    }, [userId]);

    const handleStartQuiz = (quiz: Quiz) => {
        navigate(`/quiz/${quiz.id}`);
    };

    if (!loading && recommendations.length === 0) {
        return null;
    }

    return (
        <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-pulse" />
                <h2 className="text-2xl font-bold text-gray-900">
                    Gợi ý dành riêng cho bạn
                </h2>
            </div>

            <div className="relative group">
                {/* Scroll Container */}
                <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="min-w-[300px] w-[300px] snap-center">
                                <QuizCardSkeleton />
                            </div>
                        ))
                        : recommendations.map((quiz) => (
                            <div key={quiz.id} className="min-w-[300px] w-[300px] snap-center">
                                <QuizCard
                                    quiz={quiz}
                                    viewMode="grid"
                                    onStartQuiz={handleStartQuiz}
                                />
                            </div>
                        ))}
                </div>

                {/* Fade effects for scroll indicators */}
                <div className="absolute top-0 bottom-8 right-0 w-24 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none md:hidden" />
            </div>
        </div>
    );
};

export default RecommendedSection;
