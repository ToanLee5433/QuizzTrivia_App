/**
 * 🔒 Permission Service for RAG Chatbot
 * 
 * Handles permission checks for chunks based on visibility:
 * - Public chunks: Always accessible
 * - Password chunks: Require access token in quizzes/{quizId}/access/{uid}
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { ChunkMetadata, PermissionCheckResult } from './types';

/**
 * Check if a user has access to a specific chunk
 * 
 * @param userId - Firebase Auth UID
 * @param chunk - The chunk to check access for
 * @returns Permission result with allowed flag and optional reason
 */
export async function checkChunkAccess(
  userId: string,
  chunk: ChunkMetadata
): Promise<PermissionCheckResult> {
  // Public chunks are always accessible
  if (chunk.visibility === 'public') {
    return { allowed: true };
  }

  // Password-protected chunks require quizId and access check
  if (!chunk.quizId) {
    return {
      allowed: false,
      reason: 'Password-protected content without quiz ID',
    };
  }

  try {
    // Check if user has unlocked this quiz
    // Access tokens are stored in: quizzes/{quizId}/access/{uid}
    const accessDocRef = doc(db, 'quizzes', chunk.quizId, 'access', userId);
    const accessDoc = await getDoc(accessDocRef);

    if (accessDoc.exists()) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Quiz not unlocked - enter password to access',
      missingQuizId: chunk.quizId,
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      allowed: false,
      reason: 'Permission check failed',
    };
  }
}

/**
 * Filter an array of chunks based on user permissions
 * Performs checks in parallel for better performance
 * 
 * @param userId - Firebase Auth UID
 * @param chunks - Array of chunks to filter
 * @returns Filtered array with only accessible chunks
 */
export async function filterChunksByPermission(
  userId: string,
  chunks: ChunkMetadata[]
): Promise<ChunkMetadata[]> {
  // Quick optimization: if all chunks are public, skip permission checks
  const allPublic = chunks.every(chunk => chunk.visibility === 'public');
  if (allPublic) {
    return chunks;
  }

  // Perform permission checks in parallel
  const permissionChecks = await Promise.all(
    chunks.map(chunk => checkChunkAccess(userId, chunk))
  );

  // Filter chunks where permission is allowed
  const allowedChunks = chunks.filter((_, index) => permissionChecks[index].allowed);

  // Log statistics for debugging
  const deniedCount = chunks.length - allowedChunks.length;
  if (deniedCount > 0) {
    console.log(`🔒 Filtered out ${deniedCount} password-protected chunks for user ${userId.substring(0, 8)}...`);
  }

  return allowedChunks;
}

/**
 * Get list of locked quiz IDs from denied chunks
 * Useful for showing "unlock quiz" prompts in UI
 * 
 * @param userId - Firebase Auth UID
 * @param chunks - Array of chunks to check
 * @returns Array of quiz IDs that are locked
 */
export async function getLockedQuizIds(
  userId: string,
  chunks: ChunkMetadata[]
): Promise<string[]> {
  const lockedQuizIds = new Set<string>();

  // Check each password-protected chunk
  for (const chunk of chunks) {
    if (chunk.visibility === 'password' && chunk.quizId) {
      const result = await checkChunkAccess(userId, chunk);
      if (!result.allowed && result.missingQuizId) {
        lockedQuizIds.add(result.missingQuizId);
      }
    }
  }

  return Array.from(lockedQuizIds);
}

/**
 * Check if user has access to a specific quiz
 * Direct quiz access check without chunk context
 * 
 * @param userId - Firebase Auth UID
 * @param quizId - Quiz ID to check
 * @returns True if user has access, false otherwise
 */
export async function hasQuizAccess(
  userId: string,
  quizId: string
): Promise<boolean> {
  try {
    const accessDocRef = doc(db, 'quizzes', quizId, 'access', userId);
    const accessDoc = await getDoc(accessDocRef);
    return accessDoc.exists();
  } catch (error) {
    console.error('Quiz access check error:', error);
    return false;
  }
}
