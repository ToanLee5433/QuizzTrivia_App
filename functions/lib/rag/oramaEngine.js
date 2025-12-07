"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOramaStats = exports.oramaKeywordSearch = exports.oramaVectorSearch = exports.oramaHybridSearch = exports.invalidateOramaCache = exports.initializeOramaFromIndex = void 0;
const orama_1 = require("@orama/orama");
// ============================================================
// 🗄️ GLOBAL ORAMA INSTANCE (Warm Instance Optimization)
// ============================================================
let globalOramaDB = null;
let globalOramaLoadTime = 0;
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
    embedding: 'vector[768]', // gemini-embedding-001 outputs 768 dimensions
};
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
async function initializeOramaFromIndex(jsonIndex) {
    var _a, _b, _c, _d;
    const startTime = Date.now();
    // Check cache
    if (globalOramaDB && (Date.now() - globalOramaLoadTime) < ORAMA_CACHE_TTL_MS) {
        console.log('✅ Using cached Orama DB');
        return globalOramaDB;
    }
    console.log(`🔄 Initializing Orama DB with ${jsonIndex.totalChunks} chunks...`);
    // Create new Orama instance
    const db = await (0, orama_1.create)({
        schema: oramaSchema,
    });
    // Insert all chunks with error tracking
    let insertedCount = 0;
    const failedChunks = [];
    for (const chunk of jsonIndex.chunks) {
        try {
            await (0, orama_1.insert)(db, {
                chunkId: chunk.chunkId,
                quizId: chunk.quizId || '',
                title: chunk.title || '',
                text: chunk.text || '',
                summary: ((_a = chunk.metadata) === null || _a === void 0 ? void 0 : _a.summary) || '',
                category: ((_b = chunk.metadata) === null || _b === void 0 ? void 0 : _b.category) || '',
                difficulty: ((_c = chunk.metadata) === null || _c === void 0 ? void 0 : _c.difficulty) || '',
                tags: ((_d = chunk.metadata) === null || _d === void 0 ? void 0 : _d.tags) || [],
                embedding: chunk.embedding,
            });
            insertedCount++;
        }
        catch (error) {
            console.error(`Failed to insert chunk ${chunk.chunkId}:`, error);
            failedChunks.push(chunk.chunkId);
        }
    }
    // v4.3.1: Fail if too many chunks failed to insert (>5%)
    const failureRate = failedChunks.length / jsonIndex.chunks.length;
    if (failureRate > 0.05) {
        console.error(`❌ Too many failed inserts: ${failedChunks.length}/${jsonIndex.chunks.length} (${(failureRate * 100).toFixed(1)}%)`);
        throw new Error(`Orama initialization failed: ${failedChunks.length} chunks failed to insert`);
    }
    // Cache the instance
    globalOramaDB = db;
    globalOramaLoadTime = Date.now();
    const duration = Date.now() - startTime;
    console.log(`✅ Orama DB initialized: ${insertedCount} chunks in ${duration}ms` +
        (failedChunks.length > 0 ? ` (${failedChunks.length} failed)` : ''));
    return db;
}
exports.initializeOramaFromIndex = initializeOramaFromIndex;
/**
 * Invalidate Orama cache
 */
function invalidateOramaCache() {
    globalOramaDB = null;
    globalOramaLoadTime = 0;
    console.log('🗑️ Orama cache invalidated');
}
exports.invalidateOramaCache = invalidateOramaCache;
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
async function oramaHybridSearch(db, query, queryEmbedding, topK = 10, vectorWeight = 0.6) {
    const keywordWeight = 1 - vectorWeight;
    // 1. Keyword Search (BM25)
    const keywordResults = await (0, orama_1.search)(db, {
        term: query,
        properties: ['title', 'text', 'summary', 'tags'],
        limit: topK * 2,
    });
    // 2. Vector Search
    const vectorResults = await (0, orama_1.search)(db, {
        mode: 'vector',
        vector: {
            value: queryEmbedding,
            property: 'embedding',
        },
        similarity: 0.3,
        limit: topK * 2,
    });
    // 3. Merge results with RRF (Reciprocal Rank Fusion)
    const scoreMap = new Map();
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
        }
        else {
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
    const results = [];
    for (const [_chunkId, data] of scoreMap) {
        const rrfKeyword = data.keywordRank !== Infinity ? 1 / (k + data.keywordRank) : 0;
        const rrfVector = data.vectorRank !== Infinity ? 1 / (k + data.vectorRank) : 0;
        const hybridScore = (keywordWeight * rrfKeyword) + (vectorWeight * rrfVector);
        // Determine match type
        let matchType = 'hybrid';
        if (data.keywordRank === Infinity)
            matchType = 'vector';
        else if (data.vectorRank === Infinity)
            matchType = 'keyword';
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
exports.oramaHybridSearch = oramaHybridSearch;
/**
 * Vector-only search using Orama
 */
async function oramaVectorSearch(db, queryEmbedding, topK = 10) {
    const results = await (0, orama_1.search)(db, {
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
        matchType: 'vector',
    }));
}
exports.oramaVectorSearch = oramaVectorSearch;
/**
 * Keyword-only search using Orama (BM25)
 */
async function oramaKeywordSearch(db, query, topK = 10) {
    const results = await (0, orama_1.search)(db, {
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
        matchType: 'keyword',
    }));
}
exports.oramaKeywordSearch = oramaKeywordSearch;
// ============================================================
// 📊 UTILITY FUNCTIONS
// ============================================================
/**
 * Get Orama DB statistics
 */
function getOramaStats() {
    const cacheAge = globalOramaDB ? Date.now() - globalOramaLoadTime : 0;
    return {
        initialized: globalOramaDB !== null,
        cacheAge,
        cacheValid: globalOramaDB !== null && cacheAge < ORAMA_CACHE_TTL_MS,
    };
}
exports.getOramaStats = getOramaStats;
//# sourceMappingURL=oramaEngine.js.map