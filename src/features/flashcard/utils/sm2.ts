/**
 * SM-2 Spaced Repetition Algorithm
 * Implementation of the SuperMemo 2 algorithm for optimal review scheduling
 * 
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import type { SpacedRepetitionData } from '../types/flashcard';
import { ReviewQuality } from '../types/flashcard';

/**
 * SM-2 Algorithm Constants
 */
const SM2_CONSTANTS = {
  MIN_EFACTOR: 1.3,
  DEFAULT_EFACTOR: 2.5,
  INITIAL_INTERVAL: 1, // days
  SECOND_INTERVAL: 6, // days
} as const;

/**
 * Calculate new spaced repetition data after a review
 * 
 * @param current - Current spaced repetition data
 * @param quality - Review quality (0-5)
 * @returns Updated spaced repetition data
 */
export function calculateNextReview(
  current: SpacedRepetitionData,
  quality: ReviewQuality
): SpacedRepetitionData {
  const now = new Date();
  
  // Calculate new ease factor
  const newEFactor = calculateNewEFactor(current.eFactor, quality);
  
  // Calculate new interval and repetitions
  let newInterval: number;
  let newRepetitions: number;
  
  if (quality < ReviewQuality.HARD) {
    // Failed review - reset progress
    newInterval = SM2_CONSTANTS.INITIAL_INTERVAL;
    newRepetitions = 0;
  } else {
    // Successful review
    newRepetitions = current.repetitions + 1;
    
    if (newRepetitions === 1) {
      newInterval = SM2_CONSTANTS.INITIAL_INTERVAL;
    } else if (newRepetitions === 2) {
      newInterval = SM2_CONSTANTS.SECOND_INTERVAL;
    } else {
      // For subsequent reviews, multiply previous interval by ease factor
      newInterval = Math.round(current.interval * newEFactor);
    }
  }
  
  // Calculate next review date
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + newInterval);
  
  // Update statistics
  const totalReviews = current.totalReviews + 1;
  const correctReviews = quality >= ReviewQuality.HARD 
    ? current.correctReviews + 1 
    : current.correctReviews;
  
  return {
    ...current,
    eFactor: newEFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    lastReview: now,
    nextReview,
    totalReviews,
    correctReviews,
    updatedAt: now
  };
}

/**
 * Calculate new ease factor based on review quality
 * 
 * Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * 
 * @param currentEFactor - Current ease factor
 * @param quality - Review quality (0-5)
 * @returns New ease factor (minimum 1.3)
 */
function calculateNewEFactor(
  currentEFactor: number,
  quality: ReviewQuality
): number {
  const newEFactor = currentEFactor + (
    0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );
  
  // Ensure minimum ease factor
  return Math.max(newEFactor, SM2_CONSTANTS.MIN_EFACTOR);
}

/**
 * Initialize spaced repetition data for a new card
 * 
 * @param cardId - Card ID
 * @param deckId - Deck ID
 * @param userId - User ID
 * @returns Initial spaced repetition data
 */
export function initializeSpacedData(
  cardId: string,
  deckId: string,
  userId: string
): SpacedRepetitionData {
  const now = new Date();
  
  return {
    cardId,
    deckId,
    userId,
    eFactor: SM2_CONSTANTS.DEFAULT_EFACTOR,
    interval: 0,
    repetitions: 0,
    lastReview: now,
    nextReview: now, // Due immediately for first review
    totalReviews: 0,
    correctReviews: 0,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Check if a card is due for review
 * 
 * @param spacedData - Spaced repetition data
 * @returns True if card is due for review
 */
export function isCardDue(spacedData: SpacedRepetitionData): boolean {
  const now = new Date();
  return spacedData.nextReview <= now;
}

/**
 * Get cards due for review today
 * 
 * @param allSpacedData - All spaced repetition data
 * @returns Array of card IDs due for review
 */
export function getDueCards(
  allSpacedData: SpacedRepetitionData[]
): string[] {
  const now = new Date();
  
  return allSpacedData
    .filter(data => data.nextReview <= now)
    .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
    .map(data => data.cardId);
}

/**
 * Get new cards that haven't been reviewed yet
 * 
 * @param allSpacedData - All spaced repetition data
 * @param allCardIds - All card IDs in the deck
 * @param limit - Maximum number of new cards to return
 * @returns Array of card IDs for new cards
 */
export function getNewCards(
  allSpacedData: SpacedRepetitionData[],
  allCardIds: string[],
  limit: number = 20
): string[] {
  const reviewedCardIds = new Set(allSpacedData.map(data => data.cardId));
  
  return allCardIds
    .filter(cardId => !reviewedCardIds.has(cardId))
    .slice(0, limit);
}

/**
 * Calculate optimal daily review count based on user's performance
 * 
 * @param accuracy - User's accuracy rate (0-1)
 * @param averageTime - Average time per card in seconds
 * @returns Recommended daily review count
 */
export function calculateDailyReviewCount(
  accuracy: number,
  averageTime: number
): number {
  const baseCount = 20;
  
  // Adjust based on accuracy (higher accuracy = more cards)
  const accuracyMultiplier = 0.5 + accuracy; // 0.5 to 1.5
  
  // Adjust based on speed (faster = more cards)
  const speedMultiplier = averageTime < 10 ? 1.2 : 
                          averageTime < 20 ? 1.0 : 0.8;
  
  return Math.round(baseCount * accuracyMultiplier * speedMultiplier);
}

/**
 * Get retention statistics for a deck
 * 
 * @param allSpacedData - All spaced repetition data for the deck
 * @returns Retention statistics
 */
export function getRetentionStats(
  allSpacedData: SpacedRepetitionData[]
): {
  averageEFactor: number;
  averageInterval: number;
  overallAccuracy: number;
  matureCards: number; // Cards with interval >= 21 days
  youngCards: number; // Cards with interval < 21 days
  newCards: number; // Cards with 0 reviews
} {
  if (allSpacedData.length === 0) {
    return {
      averageEFactor: SM2_CONSTANTS.DEFAULT_EFACTOR,
      averageInterval: 0,
      overallAccuracy: 0,
      matureCards: 0,
      youngCards: 0,
      newCards: 0
    };
  }
  
  const totalEFactor = allSpacedData.reduce((sum, data) => sum + data.eFactor, 0);
  const totalInterval = allSpacedData.reduce((sum, data) => sum + data.interval, 0);
  const totalReviews = allSpacedData.reduce((sum, data) => sum + data.totalReviews, 0);
  const totalCorrect = allSpacedData.reduce((sum, data) => sum + data.correctReviews, 0);
  
  const matureCards = allSpacedData.filter(data => data.interval >= 21).length;
  const youngCards = allSpacedData.filter(data => 
    data.interval > 0 && data.interval < 21
  ).length;
  const newCards = allSpacedData.filter(data => data.totalReviews === 0).length;
  
  return {
    averageEFactor: totalEFactor / allSpacedData.length,
    averageInterval: totalInterval / allSpacedData.length,
    overallAccuracy: totalReviews > 0 ? totalCorrect / totalReviews : 0,
    matureCards,
    youngCards,
    newCards
  };
}

/**
 * Predict when all cards will be reviewed (workload forecast)
 * 
 * @param allSpacedData - All spaced repetition data
 * @param dailyLimit - Daily review limit
 * @returns Number of days until all cards are reviewed
 */
export function predictWorkload(
  allSpacedData: SpacedRepetitionData[],
  dailyLimit: number
): number {
  const dueCards = getDueCards(allSpacedData);
  return Math.ceil(dueCards.length / dailyLimit);
}

/**
 * Format interval as human-readable text
 * 
 * @param interval - Interval in days
 * @returns Human-readable text
 */
export function formatInterval(interval: number): string {
  if (interval === 0) return 'New';
  if (interval === 1) return '1 day';
  if (interval < 7) return `${interval} days`;
  if (interval < 30) return `${Math.round(interval / 7)} weeks`;
  if (interval < 365) return `${Math.round(interval / 30)} months`;
  return `${Math.round(interval / 365)} years`;
}

/**
 * Export for testing
 */
export const __testing__ = {
  calculateNewEFactor,
  SM2_CONSTANTS
};
