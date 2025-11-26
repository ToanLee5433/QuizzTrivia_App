/**
 * 🔍 Orama Search Engine v1.0
 * 
 * GIAI ĐOẠN 1: Thay thế JSON brute-force bằng Orama DB
 * 
 * FEATURES:
 * - Hybrid Search: Vector similarity + Keyword matching
 * - In-memory database với khởi tạo nhanh từ JSON index
 * - BM25 cho keyword search
 * - Cosine similarity cho vector search
 * 
 * PERFORMANCE:
 * - Orama: O(log n) search vs JSON brute-force O(n)
 * - Hybrid search tốt hơn cho Vietnamese text
 */

import { create, insert, search } from '@orama/orama';

// Type alias cho Orama DB - sử dụng any để tránh complex type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OramaDB = any;

// ============================================================
// 📊 TYPE DEFINITIONS
// ============================================================

export interface OramaDocument {
  chunkId: string;
  quizId: string;
  title: string;
  text: string;
  summary: string;
  category: string;
  difficulty: string;
  tags: string[];
  embedding: number[];
}

export interface OramaSearchResult {
  chunkId: string;
  quizId: string;
  title: string;
  text: string;
  summary: string;
  score: number;
  matchType: 'vector' | 'keyword' | 'hybrid';
}

export interface VectorChunk {
  chunkId: string;
  quizId?: string;
  text: string;
  title: string;
  embedding: number[];
  metadata?: {
    title: string;
    summary?: string;
    category?: string;
    difficulty?: string;
    tags?: string[];
  };
}

export interface VectorIndex {
  version: string;
  createdAt: number;
  totalChunks: number;
  chunks: VectorChunk[];
  sources: Record<string, number>;
}

// ============================================================
// 🗄️ GLOBAL ORAMA INSTANCE (Warm Instance Optimization)
// ============================================================

let globalOramaDB: OramaDB | null = null;
let globalOramaLoadTime: number = 0;
const ORAMA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Schema for Orama database
const oramaSchema = {
  chunkId: 'string',
  quizId: 'string',
  title: 'string',
  text: 'string',
  summary: 'string',
  category: 'string',
  difficulty: 'string',
  tags: 'string[]',
  embedding: 'vector[768]', // text-embedding-004 outputs 768 dimensions
} as const;

// ============================================================
// 🔧 ORAMA INITIALIZATION
// ============================================================

/**
 * Tạo Orama DB từ JSON index
 * 
 * Flow:
 * 1. Load JSON index từ Storage
 * 2. Tạo Orama schema
 * 3. Insert tất cả chunks vào Orama
 * 4. Return Orama instance
 */
export async function initializeOramaFromIndex(
  jsonIndex: VectorIndex
): Promise<OramaDB> {
  const startTime = Date.now();
  
  // Check cache
  if (globalOramaDB && (Date.now() - globalOramaLoadTime) < ORAMA_CACHE_TTL_MS) {
    console.log('✅ Using cached Orama DB');
    return globalOramaDB;
  }
  
  console.log(`🔄 Initializing Orama DB with ${jsonIndex.totalChunks} chunks...`);
  
  // Create new Orama instance
  const db = await create({
    schema: oramaSchema,
  });
  
  // Insert all chunks
  let insertedCount = 0;
  for (const chunk of jsonIndex.chunks) {
    try {
      await insert(db, {
        chunkId: chunk.chunkId,
        quizId: chunk.quizId || '',
        title: chunk.title || '',
        text: chunk.text || '',
        summary: chunk.metadata?.summary || '',
        category: chunk.metadata?.category || '',
        difficulty: chunk.metadata?.difficulty || '',
        tags: chunk.metadata?.tags || [],
        embedding: chunk.embedding,
      });
      insertedCount++;
    } catch (error) {
      console.error(`Failed to insert chunk ${chunk.chunkId}:`, error);
    }
  }
  
  // Cache the instance
  globalOramaDB = db;
  globalOramaLoadTime = Date.now();
  
  const duration = Date.now() - startTime;
  console.log(`✅ Orama DB initialized: ${insertedCount} chunks in ${duration}ms`);
  
  return db;
}

/**
 * Invalidate Orama cache
 */
export function invalidateOramaCache(): void {
  globalOramaDB = null;
  globalOramaLoadTime = 0;
  console.log('🗑️ Orama cache invalidated');
}

// ============================================================
// 🔍 HYBRID SEARCH (Vector + Keyword)
// ============================================================

/**
 * Hybrid Search: Kết hợp Vector + Keyword
 * 
 * @param db - Orama database instance
 * @param query - Search query text
 * @param queryEmbedding - Query embedding vector
 * @param topK - Number of results to return
 * @param vectorWeight - Weight for vector search (0-1)
 */
export async function oramaHybridSearch(
  db: OramaDB,
  query: string,
  queryEmbedding: number[],
  topK: number = 10,
  vectorWeight: number = 0.6
): Promise<OramaSearchResult[]> {
  const keywordWeight = 1 - vectorWeight;
  
  // 1. Keyword Search (BM25)
  const keywordResults = await search(db, {
    term: query,
    properties: ['title', 'text', 'summary', 'tags'],
    limit: topK * 2,
  });
  
  // 2. Vector Search
  const vectorResults = await search(db, {
    mode: 'vector',
    vector: {
      value: queryEmbedding,
      property: 'embedding',
    },
    similarity: 0.3, // Minimum similarity threshold
    limit: topK * 2,
  });
  
  // 3. Merge results with RRF (Reciprocal Rank Fusion)
  const scoreMap = new Map<string, {
    doc: any;
    keywordRank: number;
    vectorRank: number;
    keywordScore: number;
    vectorScore: number;
  }>();
  
  // Process keyword results
  keywordResults.hits.forEach((hit, idx) => {
    const chunkId = hit.document.chunkId;
    scoreMap.set(chunkId, {
      doc: hit.document,
      keywordRank: idx + 1,
      vectorRank: Infinity,
      keywordScore: hit.score,
      vectorScore: 0,
    });
  });
  
  // Process vector results
  vectorResults.hits.forEach((hit, idx) => {
    const chunkId = hit.document.chunkId;
    const existing = scoreMap.get(chunkId);
    
    if (existing) {
      existing.vectorRank = idx + 1;
      existing.vectorScore = hit.score;
    } else {
      scoreMap.set(chunkId, {
        doc: hit.document,
        keywordRank: Infinity,
        vectorRank: idx + 1,
        keywordScore: 0,
        vectorScore: hit.score,
      });
    }
  });
  
  // 4. Calculate RRF scores
  const k = 60; // RRF constant
  const results: OramaSearchResult[] = [];
  
  for (const [_chunkId, data] of scoreMap) {
    const rrfKeyword = data.keywordRank !== Infinity ? 1 / (k + data.keywordRank) : 0;
    const rrfVector = data.vectorRank !== Infinity ? 1 / (k + data.vectorRank) : 0;
    
    const hybridScore = (keywordWeight * rrfKeyword) + (vectorWeight * rrfVector);
    
    // Determine match type
    let matchType: 'vector' | 'keyword' | 'hybrid' = 'hybrid';
    if (data.keywordRank === Infinity) matchType = 'vector';
    else if (data.vectorRank === Infinity) matchType = 'keyword';
    
    results.push({
      chunkId: data.doc.chunkId,
      quizId: data.doc.quizId,
      title: data.doc.title,
      text: data.doc.text,
      summary: data.doc.summary,
      score: hybridScore,
      matchType,
    });
  }
  
  // 5. Sort by score and return top K
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, topK);
}

/**
 * Vector-only search using Orama
 */
export async function oramaVectorSearch(
  db: OramaDB,
  queryEmbedding: number[],
  topK: number = 10
): Promise<OramaSearchResult[]> {
  const results = await search(db, {
    mode: 'vector',
    vector: {
      value: queryEmbedding,
      property: 'embedding',
    },
    similarity: 0.3,
    limit: topK,
  });
  
  return results.hits.map(hit => ({
    chunkId: hit.document.chunkId,
    quizId: hit.document.quizId,
    title: hit.document.title,
    text: hit.document.text,
    summary: hit.document.summary,
    score: hit.score,
    matchType: 'vector' as const,
  }));
}

/**
 * Keyword-only search using Orama (BM25)
 */
export async function oramaKeywordSearch(
  db: OramaDB,
  query: string,
  topK: number = 10
): Promise<OramaSearchResult[]> {
  const results = await search(db, {
    term: query,
    properties: ['title', 'text', 'summary', 'tags'],
    limit: topK,
  });
  
  return results.hits.map(hit => ({
    chunkId: hit.document.chunkId,
    quizId: hit.document.quizId,
    title: hit.document.title,
    text: hit.document.text,
    summary: hit.document.summary,
    score: hit.score,
    matchType: 'keyword' as const,
  }));
}

// ============================================================
// 📊 UTILITY FUNCTIONS
// ============================================================

/**
 * Get Orama DB statistics
 */
export function getOramaStats(): {
  initialized: boolean;
  cacheAge: number;
  cacheValid: boolean;
} {
  const cacheAge = globalOramaDB ? Date.now() - globalOramaLoadTime : 0;
  
  return {
    initialized: globalOramaDB !== null,
    cacheAge,
    cacheValid: globalOramaDB !== null && cacheAge < ORAMA_CACHE_TTL_MS,
  };
}
