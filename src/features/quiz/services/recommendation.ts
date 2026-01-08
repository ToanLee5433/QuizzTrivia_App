import { Quiz } from '../types';
import { getQuizzes } from './quiz';

const API_URL = import.meta.env.VITE_RECOMMENDATION_API_URL;
const API_TIMEOUT = 5000; // 5 seconds timeout for API calls

export interface RecommendationParams {
    userId: string;
    limit?: number;
    category?: string; // Optional: filter by category
}

export interface RecommendationResponse {
    quizzes: Quiz[];
    source: 'api' | 'fallback';
    cached?: boolean;
}

// Simple in-memory cache for recommendations
const recommendationCache = new Map<string, { data: Quiz[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const getCacheKey = (userId: string, limit: number, category?: string) => 
    `${userId}-${limit}-${category || 'all'}`;

const getFromCache = (key: string): Quiz[] | null => {
    const cached = recommendationCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('📦 Using cached recommendations');
        return cached.data;
    }
    return null;
};

const setCache = (key: string, data: Quiz[]) => {
    recommendationCache.set(key, { data, timestamp: Date.now() });
};

// Hash function for consistent shuffling per user
const getHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

// Fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getRecommendations = async ({ 
    userId, 
    limit = 4, 
    category 
}: RecommendationParams): Promise<Quiz[]> => {
    // Check cache first
    const cacheKey = getCacheKey(userId, limit, category);
    const cached = getFromCache(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // Try external API first if configured
        if (API_URL) {
            console.log('🔮 Fetching recommendations from External API:', API_URL);
            try {
                const queryParams = new URLSearchParams({
                    userId,
                    limit: limit.toString(),
                    ...(category && { category })
                });
                
                const response = await fetchWithTimeout(
                    `${API_URL}?${queryParams}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    },
                    API_TIMEOUT
                );

                if (response.ok) {
                    const data = await response.json();
                    // Handle both array response and { quizzes: [] } response format
                    const quizzes = Array.isArray(data) ? data : (data.quizzes || data.recommendations || []);
                    
                    if (Array.isArray(quizzes) && quizzes.length > 0) {
                        console.log(`✅ Loaded ${quizzes.length} recommendations from API`);
                        setCache(cacheKey, quizzes);
                        return quizzes as Quiz[];
                    }
                } else {
                    console.warn('⚠️ Recommendation API returned non-OK status:', response.status);
                }
            } catch (apiError) {
                if (apiError instanceof Error && apiError.name === 'AbortError') {
                    console.warn('⏱️ Recommendation API timeout');
                } else {
                    console.error('❌ Error calling Recommendation API:', apiError);
                }
                // Fallthrough to fallback
            }
        }

        // Fallback: Use Firestore with smart shuffling
        console.log('⚠️ Using Fallback Recommendations (Firestore)');
        const FALLBACK_POOL_SIZE = 20;
        const fallbackResult = await getQuizzes(
            category ? { category } : undefined, 
            Math.max(limit, FALLBACK_POOL_SIZE)
        );

        if (!fallbackResult.quizzes || fallbackResult.quizzes.length === 0) {
            console.warn('📭 No quizzes available for recommendations');
            return [];
        }

        // Deterministic shuffle based on userId for consistent recommendations
        const shuffled = [...fallbackResult.quizzes].sort((a, b) => {
            const hashA = getHash(userId + a.id);
            const hashB = getHash(userId + b.id);
            return hashA - hashB;
        });
        
        const result = shuffled.slice(0, limit);
        setCache(cacheKey, result);
        return result;

    } catch (error) {
        console.error('🔥 Fatal error in recommendation service:', error);
        return [];
    }
};

// Utility to clear cache (useful for testing or manual refresh)
export const clearRecommendationCache = () => {
    recommendationCache.clear();
    console.log('🗑️ Recommendation cache cleared');
};

// Utility to get recommendation with detailed response
export const getRecommendationsDetailed = async (
    params: RecommendationParams
): Promise<RecommendationResponse> => {
    const quizzes = await getRecommendations(params);
    const cacheKey = getCacheKey(params.userId, params.limit || 4, params.category);
    const cached = recommendationCache.has(cacheKey);
    
    return {
        quizzes,
        source: API_URL ? 'api' : 'fallback',
        cached
    };
};
