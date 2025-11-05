/**
 * 🧠 Embedding Generation with Google AI
 * 
 * Note: Using direct Google AI API instead of Genkit embedder
 * for better compatibility with text-embedding-004
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI with API key
// Use process.env for Node.js scripts, import.meta.env for browser/Vite
const GOOGLE_AI_API_KEY = typeof process !== 'undefined' && process.env?.VITE_GOOGLE_AI_API_KEY 
  ? process.env.VITE_GOOGLE_AI_API_KEY 
  : 'AIzaSyDQT4sxlCRVxm0xqvfzaBIobv-3y8KfV-k';
const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);

/**
 * Generate embedding for a text using Google AI text-embedding-004
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const result = await model.embedContent(text);
    
    return result.embedding.values;
  } catch (error) {
    console.error('❌ Failed to generate embedding:', error);
    throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
    
    // Rate limiting: wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) {
    return 0;
  }
  
  return dotProduct / denominator;
}

/**
 * Find top K most similar chunks to query embedding
 */
export function findTopKSimilar(
  queryEmbedding: number[],
  chunkEmbeddings: { id: string; embedding: number[] }[],
  topK: number = 5,
  minSimilarity: number = 0.6
): Array<{ id: string; similarity: number }> {
  // Calculate similarity for each chunk
  const similarities = chunkEmbeddings.map(chunk => ({
    id: chunk.id,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));
  
  // Filter by minimum similarity and sort descending
  const filtered = similarities
    .filter(item => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);
  
  // Return top K
  return filtered.slice(0, topK);
}
