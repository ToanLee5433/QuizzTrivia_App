/**
 * 🎯 Quiz RAG Index Triggers
 * 
 * Event-Driven Architecture for automatic RAG index updates
 * 
 * These triggers automatically maintain the RAG vector index in sync with the quiz database:
 * 
 * 1. onQuizApproved - When admin approves a quiz (pending -> approved)
 *    → Generates embeddings and adds quiz to RAG index
 * 
 * 2. onQuizCreatedApproved - When a quiz is created with approved status directly
 *    → Generates embeddings and adds quiz to RAG index
 * 
 * 3. onQuizApproved (content update) - When approved quiz content changes
 *    → Re-generates embeddings and updates quiz in RAG index
 * 
 * 4. onQuizDeleted - When a quiz is deleted
 *    → Removes quiz chunks from RAG index
 * 
 * Benefits:
 * - No manual "Build Index" needed
 * - Incremental updates (only changed quiz, not full rebuild)
 * - Real-time sync with quiz database
 * - Efficient: Only embeds approved quizzes
 */

// Quiz approval triggers (handles create, update, status changes)
export { onQuizApproved, onQuizCreatedApproved } from './onQuizApproved';

// Quiz deletion trigger
export { onQuizDeleted } from './onQuizDeleted';
