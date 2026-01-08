
import { Quiz } from '../types';
import { getQuizzes } from './quiz';

const API_URL = import.meta.env.VITE_RECOMMENDATION_API_URL;

export interface RecommendationParams {
    userId: string;
    limit?: number;
}

export const getRecommendations = async ({ userId, limit = 4 }: RecommendationParams): Promise<Quiz[]> => {
    try {
        if (API_URL) {
            console.log('🔮 Fetching recommendations from External API:', API_URL);
            try {
                const response = await fetch(`${API_URL}?userId=${userId}&limit=${limit}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    // Validate that data is an array of quizzes
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`✅ Loaded ${data.length} recommendations from API`);
                        return data as Quiz[];
                    }
                } else {
                    console.warn('⚠️ Recommendation API returned non-OK status:', response.status);
                }
            } catch (apiError) {
                console.error('❌ Error calling Recommendation API:', apiError);
                // Fallthrough to fallback
            }
        }

        console.log('⚠️ Using Fallback Recommendations (Firestore)');
        // Fetch a larger pool (e.g., 20) to ensure we have enough to randomize effectively
        const FALLBACK_POOL_SIZE = 20;
        const fallbackResult = await getQuizzes(undefined, Math.max(limit, FALLBACK_POOL_SIZE));

        const getHash = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        };

        const shuffled = [...fallbackResult.quizzes].sort((a, b) => {
            const hashA = getHash(userId + a.id);
            const hashB = getHash(userId + b.id);
            return hashA - hashB;
        });
        return shuffled.slice(0, limit);

    } catch (error) {
        console.error('🔥 Fatal error in recommendation service:', error);
        return [];
    }
};
