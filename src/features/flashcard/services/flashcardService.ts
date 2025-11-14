/**
 * Flashcard Firestore Service
 * Handles all Firebase Firestore operations for flashcards
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db as firestore } from '../../../firebase/config';
import type {
  FlashcardDeck,
  Flashcard,
  SpacedRepetitionData,
  DeckProgress,
  ServiceResult,
  DeckListResult,
  CardListResult,
  DeckFilterOptions,
  DeckSortOptions
} from '../types/flashcard';

// Collection names
const COLLECTIONS = {
  DECKS: 'flashcard_decks',
  CARDS: 'flashcard_cards',
  SPACED_DATA: 'flashcard_spaced_data',
  DECK_PROGRESS: 'flashcard_deck_progress'
} as const;

// ============================================================================
// DECK OPERATIONS
// ============================================================================

/**
 * Create a new flashcard deck
 */
export async function createDeck(
  deck: Omit<FlashcardDeck, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServiceResult<FlashcardDeck>> {
  try {
    const docRef = await addDoc(collection(firestore, COLLECTIONS.DECKS), {
      ...deck,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const newDeck: FlashcardDeck = {
      ...deck,
      id: docRef.id,
      createdAt: new Date() as any,
      updatedAt: new Date() as any
    };
    
    return { success: true, data: newDeck };
  } catch (error) {
    console.error('Error creating deck:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get a single deck by ID
 */
export async function getDeck(deckId: string): Promise<ServiceResult<FlashcardDeck>> {
  try {
    const docRef = doc(firestore, COLLECTIONS.DECKS, deckId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { success: false, error: 'Deck not found' };
    }
    
    const data = docSnap.data();
    const deck: FlashcardDeck = {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate()
    } as FlashcardDeck;
    
    return { success: true, data: deck };
  } catch (error) {
    console.error('Error getting deck:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get decks with filtering and pagination
 */
export async function getDecks(
  options: {
    filter?: DeckFilterOptions;
    sort?: DeckSortOptions;
    limitCount?: number;
    cursor?: string;
  } = {}
): Promise<ServiceResult<DeckListResult>> {
  try {
    const {
      filter,
      sort = { sortBy: 'updatedAt', order: 'desc' },
      limitCount = 20,
      cursor
    } = options;
    
    // Build query constraints
    const constraints: QueryConstraint[] = [];
    
    // Apply filters
    if (filter?.authorId) {
      constraints.push(where('authorId', '==', filter.authorId));
    }
    if (filter?.public !== undefined) {
      constraints.push(where('public', '==', filter.public));
    }
    if (filter?.tags && filter.tags.length > 0) {
      constraints.push(where('tags', 'array-contains-any', filter.tags));
    }
    
    // Apply sorting
    constraints.push(orderBy(sort.sortBy, sort.order));
    
    // Apply pagination
    if (cursor) {
      const cursorDoc = await getDoc(doc(firestore, COLLECTIONS.DECKS, cursor));
      if (cursorDoc.exists()) {
        constraints.push(startAfter(cursorDoc));
      }
    }
    constraints.push(limit(limitCount + 1)); // Fetch one extra to check hasMore
    
    // Execute query
    const q = query(collection(firestore, COLLECTIONS.DECKS), ...constraints);
    const querySnapshot = await getDocs(q);
    
    // Process results
    const decks: FlashcardDeck[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      decks.push({
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as FlashcardDeck);
    });
    
    // Check if there are more results
    const hasMore = decks.length > limitCount;
    if (hasMore) {
      decks.pop(); // Remove extra document
    }
    
    return {
      success: true,
      data: {
        decks,
        hasMore,
        cursor: hasMore ? decks[decks.length - 1].id : undefined
      }
    };
  } catch (error) {
    console.error('Error getting decks:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update a deck
 */
export async function updateDeck(
  deckId: string,
  updates: Partial<Omit<FlashcardDeck, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ServiceResult<void>> {
  try {
    const docRef = doc(firestore, COLLECTIONS.DECKS, deckId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating deck:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a deck and all its cards
 */
export async function deleteDeck(deckId: string): Promise<ServiceResult<void>> {
  try {
    const batch = writeBatch(firestore);
    
    // Delete deck
    batch.delete(doc(firestore, COLLECTIONS.DECKS, deckId));
    
    // Delete all cards in deck
    const cardsQuery = query(
      collection(firestore, COLLECTIONS.CARDS),
      where('deckId', '==', deckId)
    );
    const cardsSnapshot = await getDocs(cardsQuery);
    cardsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting deck:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ============================================================================
// CARD OPERATIONS
// ============================================================================

/**
 * Create a new flashcard
 */
export async function createCard(
  card: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServiceResult<Flashcard>> {
  try {
    // Add card
    const cardRef = await addDoc(collection(firestore, COLLECTIONS.CARDS), {
      ...card,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update deck card count
    const deckRef = doc(firestore, COLLECTIONS.DECKS, card.deckId);
    const deckSnap = await getDoc(deckRef);
    if (deckSnap.exists()) {
      const currentCount = deckSnap.data().cardCount || 0;
      await updateDoc(deckRef, {
        cardCount: currentCount + 1,
        updatedAt: serverTimestamp()
      });
    }
    
    const newCard: Flashcard = {
      ...card,
      id: cardRef.id,
      createdAt: new Date() as any,
      updatedAt: new Date() as any
    };
    
    return { success: true, data: newCard };
  } catch (error) {
    console.error('Error creating card:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get all cards in a deck
 */
export async function getCards(deckId: string): Promise<ServiceResult<CardListResult>> {
  try {
    const q = query(
      collection(firestore, COLLECTIONS.CARDS),
      where('deckId', '==', deckId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const cards: Flashcard[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      cards.push({
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as Flashcard);
    });
    
    return {
      success: true,
      data: {
        cards,
        total: cards.length
      }
    };
  } catch (error) {
    console.error('Error getting cards:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get a single card by ID
 */
export async function getCard(cardId: string): Promise<ServiceResult<Flashcard>> {
  try {
    const docRef = doc(firestore, COLLECTIONS.CARDS, cardId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { success: false, error: 'Card not found' };
    }
    
    const data = docSnap.data();
    const card: Flashcard = {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate()
    } as Flashcard;
    
    return { success: true, data: card };
  } catch (error) {
    console.error('Error getting card:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update a card
 */
export async function updateCard(
  cardId: string,
  updates: Partial<Omit<Flashcard, 'id' | 'deckId' | 'createdAt' | 'updatedAt'>>
): Promise<ServiceResult<void>> {
  try {
    const docRef = doc(firestore, COLLECTIONS.CARDS, cardId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating card:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a card
 */
export async function deleteCard(cardId: string): Promise<ServiceResult<void>> {
  try {
    const cardRef = doc(firestore, COLLECTIONS.CARDS, cardId);
    const cardSnap = await getDoc(cardRef);
    
    if (!cardSnap.exists()) {
      return { success: false, error: 'Card not found' };
    }
    
    const deckId = cardSnap.data().deckId;
    
    // Delete card
    await deleteDoc(cardRef);
    
    // Update deck card count
    const deckRef = doc(firestore, COLLECTIONS.DECKS, deckId);
    const deckSnap = await getDoc(deckRef);
    if (deckSnap.exists()) {
      const currentCount = deckSnap.data().cardCount || 0;
      await updateDoc(deckRef, {
        cardCount: Math.max(0, currentCount - 1),
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting card:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ============================================================================
// SPACED REPETITION OPERATIONS
// ============================================================================

/**
 * Get or create spaced repetition data for a card
 */
export async function getOrCreateSpacedData(
  cardId: string,
  deckId: string,
  userId: string
): Promise<ServiceResult<SpacedRepetitionData>> {
  try {
    // Try to get existing data
    const q = query(
      collection(firestore, COLLECTIONS.SPACED_DATA),
      where('cardId', '==', cardId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      const spacedData: SpacedRepetitionData = {
        cardId,
        ...data,
        lastReview: (data.lastReview as Timestamp).toDate(),
        nextReview: (data.nextReview as Timestamp).toDate(),
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as SpacedRepetitionData;
      
      return { success: true, data: spacedData };
    }
    
    // Create new data
    const now = new Date();
    const newData: Omit<SpacedRepetitionData, 'createdAt' | 'updatedAt'> = {
      cardId,
      deckId,
      userId,
      eFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lastReview: now,
      nextReview: now,
      totalReviews: 0,
      correctReviews: 0
    };
    
    await addDoc(collection(firestore, COLLECTIONS.SPACED_DATA), {
      ...newData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      data: { ...newData, createdAt: now, updatedAt: now }
    };
  } catch (error) {
    console.error('Error getting/creating spaced data:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update spaced repetition data
 */
export async function updateSpacedData(
  cardId: string,
  userId: string,
  updates: Partial<Omit<SpacedRepetitionData, 'cardId' | 'deckId' | 'userId'>>
): Promise<ServiceResult<void>> {
  try {
    const q = query(
      collection(firestore, COLLECTIONS.SPACED_DATA),
      where('cardId', '==', cardId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Spaced data not found' };
    }
    
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating spaced data:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get all spaced data for a deck and user
 */
export async function getDeckSpacedData(
  deckId: string,
  userId: string
): Promise<ServiceResult<SpacedRepetitionData[]>> {
  try {
    const q = query(
      collection(firestore, COLLECTIONS.SPACED_DATA),
      where('deckId', '==', deckId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const spacedDataList: SpacedRepetitionData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      spacedDataList.push({
        ...data,
        lastReview: (data.lastReview as Timestamp).toDate(),
        nextReview: (data.nextReview as Timestamp).toDate(),
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as SpacedRepetitionData);
    });
    
    return { success: true, data: spacedDataList };
  } catch (error) {
    console.error('Error getting deck spaced data:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ============================================================================
// DECK PROGRESS OPERATIONS
// ============================================================================

/**
 * Get or create deck progress for a user
 */
export async function getOrCreateDeckProgress(
  deckId: string,
  userId: string
): Promise<ServiceResult<DeckProgress>> {
  try {
    const q = query(
      collection(firestore, COLLECTIONS.DECK_PROGRESS),
      where('deckId', '==', deckId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      const progress: DeckProgress = {
        ...data,
        lastStudy: (data.lastStudy as Timestamp).toDate(),
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as DeckProgress;
      
      return { success: true, data: progress };
    }
    
    // Create new progress
    const now = new Date();
    const newProgress: Omit<DeckProgress, 'createdAt' | 'updatedAt'> = {
      deckId,
      userId,
      dueQueue: [],
      newQueue: [],
      cardsStudiedToday: 0,
      totalCardsStudied: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageAccuracy: 0,
      totalStudyTime: 0,
      lastStudy: now
    };
    
    await addDoc(collection(firestore, COLLECTIONS.DECK_PROGRESS), {
      ...newProgress,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      data: { ...newProgress, createdAt: now, updatedAt: now }
    };
  } catch (error) {
    console.error('Error getting/creating deck progress:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update deck progress
 */
export async function updateDeckProgress(
  deckId: string,
  userId: string,
  updates: Partial<Omit<DeckProgress, 'deckId' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<ServiceResult<void>> {
  try {
    const q = query(
      collection(firestore, COLLECTIONS.DECK_PROGRESS),
      where('deckId', '==', deckId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Deck progress not found' };
    }
    
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating deck progress:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Export all functions
export const flashcardService = {
  // Deck operations
  createDeck,
  getDeck,
  getDecks,
  updateDeck,
  deleteDeck,
  
  // Card operations
  createCard,
  getCard,
  getCards,
  updateCard,
  deleteCard,
  
  // Spaced repetition
  getOrCreateSpacedData,
  updateSpacedData,
  getDeckSpacedData,
  
  // Deck progress
  getOrCreateDeckProgress,
  updateDeckProgress
};

export default flashcardService;
