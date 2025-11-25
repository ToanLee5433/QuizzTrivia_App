"use strict";
/**
 * 🚀 Optimized RAG Implementation v2.1
 *
 * Improvements:
 * 1. ✅ Global Variable Caching (Warm Instance)
 * 2. ✅ Fast Path Strategy (search first, rewrite if poor)
 * 3. ✅ Stream Processing với TopKHeap
 * 4. ✅ Configurable Score Threshold (không hardcode)
 * 5. ✅ Hybrid Search + RRF
 * 6. ✅ Token-optimized AI Re-ranking
 * 7. ✅ Race Condition Warning cho auto-update
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.askQuestion = exports.invalidateGlobalCache = void 0;
const generative_ai_1 = require("@google/generative-ai");
const admin = require("firebase-admin");
const storage_1 = require("firebase-admin/storage");
const hybridSearch_1 = require("../lib/hybridSearch");
// ============================================================
// 🔥 GLOBAL VARIABLE CACHING (Warm Instance Optimization)
// ============================================================
// Khai báo biến Global (nằm ngoài hàm export)
// Sẽ được giữ lại giữa các lần gọi (Warm Instance)
let globalVectorIndex = null;
let globalIndexLoadTime = 0;
let globalGenAI = null;
// Cache TTL: 5 phút (configurable)
const INDEX_CACHE_TTL_MS = 5 * 60 * 1000;
// ============================================================
// 📊 CONFIGURABLE THRESHOLDS (Không hardcode!)
// ============================================================
/**
 * Score thresholds - CẦN TUNE DỰA TRÊN PRODUCTION DATA
 *
 * QUAN TRỌNG: Log topScore ra console trong 1 tuần đầu
 * để xác định ngưỡng phù hợp với model text-embedding-004
 *
 * Giá trị hiện tại là estimates, có thể cần điều chỉnh:
 * - 0.70 có thể cao quá → giảm xuống 0.62-0.65
 * - Hoặc 0.70 có thể thấp quá → tăng lên 0.75
 */
const CONFIG = {
    // Fast Path: Nếu avg score >= threshold → skip AI rewriting
    FAST_PATH_THRESHOLD: parseFloat(process.env.RAG_FAST_PATH_THRESHOLD || '0.70'),
    // Minimum score để được coi là kết quả hợp lệ
    MIN_RELEVANCE_SCORE: parseFloat(process.env.RAG_MIN_RELEVANCE || '0.40'),
    // Số kết quả vector search
    VECTOR_TOP_K: parseInt(process.env.RAG_VECTOR_TOP_K || '10'),
    // Số kết quả cuối cùng trả về
    FINAL_TOP_K: parseInt(process.env.RAG_FINAL_TOP_K || '5'),
    // Enable/disable AI reranking
    ENABLE_AI_RERANK: process.env.RAG_ENABLE_RERANK !== 'false',
    // Log score để tune (enable trong 1 tuần đầu production)
    LOG_SCORES_FOR_TUNING: process.env.RAG_LOG_SCORES === 'true',
};
// ============================================================
// 🔧 HELPER FUNCTIONS
// ============================================================
function getGenAI() {
    if (!globalGenAI) {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
        }
        globalGenAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    return globalGenAI;
}
function getEmbeddingModel() {
    return getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
}
function getChatModel() {
    return getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
}
/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
    const model = getEmbeddingModel();
    const result = await model.embedContent(text);
    return result.embedding.values;
}
/**
 * Cosine similarity calculation
 */
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
// ============================================================
// 📥 INDEX LOADING (với Global Cache)
// ============================================================
/**
 * Load vector index với Global Cache
 *
 * Tận dụng Warm Instance của Cloud Functions:
 * - Cold Start: Tải từ Storage (1-2s)
 * - Warm Start: Dùng cache từ RAM (<50ms)
 */
async function loadVectorIndex() {
    const now = Date.now();
    // Check if cached and still valid
    if (globalVectorIndex && (now - globalIndexLoadTime) < INDEX_CACHE_TTL_MS) {
        console.log('🔥 Warm Start: Using cached index from RAM');
        return globalVectorIndex;
    }
    console.log('❄️ Cold Start: Downloading index from Storage...');
    const startTime = Date.now();
    try {
        const bucket = (0, storage_1.getStorage)().bucket();
        const file = bucket.file('rag/indices/vector-index.json');
        const [exists] = await file.exists();
        if (!exists) {
            console.log('⚠️ Index file does not exist');
            return null;
        }
        const [content] = await file.download();
        const index = JSON.parse(content.toString());
        // Update global cache
        globalVectorIndex = index;
        globalIndexLoadTime = now;
        const duration = Date.now() - startTime;
        console.log(`✅ Index loaded: ${index.totalChunks} chunks in ${duration}ms`);
        return index;
    }
    catch (error) {
        console.error('❌ Failed to load index:', error);
        return null;
    }
}
/**
 * Invalidate global cache (gọi khi index được update)
 */
function invalidateGlobalCache() {
    globalVectorIndex = null;
    globalIndexLoadTime = 0;
    console.log('🗑️ Global index cache invalidated');
}
exports.invalidateGlobalCache = invalidateGlobalCache;
// ============================================================
// 🔍 TOP-K HEAP (Memory-efficient search)
// ============================================================
/**
 * Min-heap để giữ top K results với O(n log k) complexity
 * Thay vì sort toàn bộ array O(n log n)
 */
class TopKHeap {
    constructor(k) {
        this.heap = [];
        this.k = k;
    }
    add(result) {
        if (this.heap.length < this.k) {
            this.heap.push(result);
            // Keep as min-heap (lowest score first)
            this.heap.sort((a, b) => a.score - b.score);
        }
        else if (result.score > this.heap[0].score) {
            // Replace minimum if new score is higher
            this.heap[0] = result;
            this.heap.sort((a, b) => a.score - b.score);
        }
    }
    getResults() {
        // Return in descending order (highest first)
        return [...this.heap].sort((a, b) => b.score - a.score);
    }
    getMinScore() {
        return this.heap.length > 0 ? this.heap[0].score : 0;
    }
}
// ============================================================
// 🎯 VECTOR SEARCH (Core search function)
// ============================================================
/**
 * Vector search with TopK heap optimization
 */
async function vectorSearch(queryEmbedding, topK = 10) {
    var _a;
    const index = await loadVectorIndex();
    if (!index || index.chunks.length === 0) {
        return [];
    }
    const topKHeap = new TopKHeap(topK);
    // Brute-force search qua TẤT CẢ vectors
    // Giữ top K trong heap để tiết kiệm memory
    for (const chunk of index.chunks) {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        topKHeap.add({
            chunkId: chunk.chunkId,
            quizId: chunk.quizId,
            title: chunk.title,
            text: chunk.text,
            summary: (_a = chunk.metadata) === null || _a === void 0 ? void 0 : _a.summary,
            score,
        });
    }
    return topKHeap.getResults();
}
// ============================================================
// 🚀 SMART SEARCH (Fast Path + Slow Path)
// ============================================================
/**
 * Smart Search với Fast Path Strategy
 *
 * Nguyên tắc: Search trước, rewrite sau (chỉ khi kết quả kém)
 *
 * Fast Path: Direct search → nếu score tốt → return ngay
 * Slow Path: AI rewrite → re-search → merge results
 */
async function smartSearch(query, topK = CONFIG.VECTOR_TOP_K) {
    var _a;
    // === STEP 1: Generate query embedding ===
    const queryEmbedding = await generateEmbedding(query);
    // === STEP 2: FAST PATH - Direct vector search ===
    const directResults = await vectorSearch(queryEmbedding, topK);
    if (directResults.length === 0) {
        return {
            results: [],
            fastPathUsed: true,
            avgScore: 0,
            topScore: 0,
        };
    }
    // Calculate scores
    const avgScore = directResults.reduce((sum, r) => sum + r.score, 0) / directResults.length;
    const topScore = directResults[0].score;
    // Log scores cho tuning (enable trong production đầu)
    if (CONFIG.LOG_SCORES_FOR_TUNING) {
        console.log(`📊 Score Tuning Log:`, {
            query: query.substring(0, 50),
            topScore: topScore.toFixed(3),
            avgScore: avgScore.toFixed(3),
            threshold: CONFIG.FAST_PATH_THRESHOLD,
        });
    }
    // Check if Fast Path is sufficient
    if (avgScore >= CONFIG.FAST_PATH_THRESHOLD && directResults.length >= topK / 2) {
        console.log(`✅ Fast Path: avgScore=${avgScore.toFixed(3)} >= ${CONFIG.FAST_PATH_THRESHOLD}`);
        return {
            results: directResults,
            fastPathUsed: true,
            avgScore,
            topScore,
        };
    }
    // === STEP 3: SLOW PATH - AI Query Rewriting ===
    console.log(`🔄 Slow Path: avgScore=${avgScore.toFixed(3)} < ${CONFIG.FAST_PATH_THRESHOLD}`);
    const chatModel = getChatModel();
    const rewrittenQueries = await (0, hybridSearch_1.rewriteQueryWithAI)(query, chatModel);
    // Search with rewritten queries
    const allResults = [...directResults];
    for (const rewrittenQuery of rewrittenQueries.slice(1)) { // Skip original (already searched)
        const rewrittenEmbedding = await generateEmbedding(rewrittenQuery);
        const results = await vectorSearch(rewrittenEmbedding, topK);
        allResults.push(...results);
    }
    // Deduplicate by chunkId and keep highest score
    const uniqueMap = new Map();
    for (const result of allResults) {
        const existing = uniqueMap.get(result.chunkId);
        if (!existing || result.score > existing.score) {
            uniqueMap.set(result.chunkId, result);
        }
    }
    const mergedResults = Array.from(uniqueMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    const newAvgScore = mergedResults.reduce((sum, r) => sum + r.score, 0) / mergedResults.length;
    const newTopScore = ((_a = mergedResults[0]) === null || _a === void 0 ? void 0 : _a.score) || 0;
    return {
        results: mergedResults,
        fastPathUsed: false,
        avgScore: newAvgScore,
        topScore: newTopScore,
        rewriteQueries: rewrittenQueries,
    };
}
// ============================================================
// 🔀 HYBRID SEARCH (Vector + Keyword + RRF)
// ============================================================
/**
 * Hybrid Search kết hợp Semantic và Keyword search
 * Sử dụng RRF (Reciprocal Rank Fusion) để merge results
 */
async function hybridSearch(query, topK = CONFIG.VECTOR_TOP_K) {
    // 1. Smart Vector Search (với Fast Path)
    const vectorResults = await smartSearch(query, topK);
    // 2. Keyword Search
    const index = await loadVectorIndex();
    const keywords = (0, hybridSearch_1.extractKeywords)(query);
    let keywordResults = [];
    if (index && keywords.length > 0) {
        const kwResults = (0, hybridSearch_1.keywordSearch)(index.chunks, keywords, topK);
        keywordResults = kwResults.map(r => {
            var _a;
            return ({
                chunkId: r.chunkId,
                quizId: r.quizId,
                title: r.title,
                text: r.text,
                summary: (_a = r.metadata) === null || _a === void 0 ? void 0 : _a.summary,
                score: r.score / (keywords.length * 3), // Normalize to 0-1 range
            });
        });
    }
    // 3. RRF Fusion nếu có keyword results
    if (keywordResults.length > 0) {
        const fusedResults = (0, hybridSearch_1.reciprocalRankFusion)([
            vectorResults.results,
            keywordResults,
        ]);
        // Map RRF scores to SearchResult format
        const mergedResults = fusedResults.slice(0, topK).map(r => (Object.assign(Object.assign({}, r), { score: r.rrfScore })));
        return Object.assign(Object.assign({}, vectorResults), { results: mergedResults });
    }
    return vectorResults;
}
// ============================================================
// 📝 ANSWER GENERATION
// ============================================================
/**
 * Generate answer using context
 */
async function generateAnswer(question, contexts, targetLang = 'vi') {
    const model = getChatModel();
    // If no contexts, give a friendly message
    if (contexts.length === 0) {
        return {
            answer: `Xin chào! 👋 Hiện tại hệ thống chưa tìm thấy quiz phù hợp với câu hỏi của bạn.

📝 Gợi ý:
- Thử diễn đạt lại câu hỏi bằng từ ngữ khác
- Khám phá các quiz trên trang chủ
- Hoặc tạo quiz riêng của bạn!

Cảm ơn bạn đã sử dụng! 🚀`,
            tokensUsed: { input: 0, output: 0 },
        };
    }
    // Build context (token-optimized: chỉ dùng title + truncated text)
    const contextStr = contexts
        .map((ctx, i) => `[${i + 1}] ${ctx.title}\n${ctx.text.substring(0, 500)}`)
        .join('\n\n');
    const prompt = `Bạn là AI Learning Assistant - trợ lý học tập thông minh.

**NHIỆM VỤ:**
Dựa vào thông tin từ quiz/tài liệu, trả lời câu hỏi chi tiết và dễ hiểu.

**QUY TẮC QUAN TRỌNG:**
- KHÔNG liệt kê danh sách quiz trong câu trả lời
- Quiz recommendations sẽ được hiển thị tự động bên dưới
- Chỉ giải thích nội dung, khái niệm, ví dụ
- Nếu người dùng hỏi về quiz, chỉ nói "Dưới đây là các quiz phù hợp cho bạn" (không list chi tiết)

**PHONG CÁCH:**
- Thân thiện, nhiệt tình
- Giải thích từ cơ bản đến nâng cao
- Sử dụng ví dụ thực tế
- Dùng emoji cho sinh động

**ĐỊNH DẠNG:**
📚 **Giải Thích:** [Chi tiết nội dung]
💡 **Ví Dụ:** [Thực tế nếu có]
✅ **Ghi Nhớ:** [Mẹo nếu phù hợp]
🎯 **Gợi Ý:** [Dưới đây là các quiz phù hợp]

Trích dẫn nguồn: [1], [2], etc.

---

**CONTEXT:**
${contextStr}

---

**CÂU HỎI:**
${question}

**TRẢ LỜI:**`;
    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    return {
        answer,
        tokensUsed: {
            input: Math.ceil(prompt.length / 4),
            output: Math.ceil(answer.length / 4),
        },
    };
}
// ============================================================
// 📊 FETCH QUIZ DETAILS
// ============================================================
/**
 * Fetch full quiz details for recommendations
 */
async function fetchQuizDetails(quizIds) {
    var _a, _b;
    const recommendations = [];
    const quizzesRef = admin.firestore().collection('quizzes');
    for (const quizId of quizIds.slice(0, CONFIG.FINAL_TOP_K)) {
        try {
            const quizDoc = await quizzesRef.doc(quizId).get();
            if (quizDoc.exists) {
                const quizData = quizDoc.data();
                if (quizData && quizData.status === 'approved') {
                    recommendations.push({
                        quizId,
                        title: quizData.title || 'Untitled Quiz',
                        description: quizData.description || '',
                        imageUrl: quizData.imageUrl || null,
                        difficulty: quizData.difficulty || 'medium',
                        category: quizData.category || 'Uncategorized',
                        questionCount: quizData.questionCount || 0,
                        averageRating: ((_a = quizData.stats) === null || _a === void 0 ? void 0 : _a.averageRating) || 0,
                        totalAttempts: ((_b = quizData.stats) === null || _b === void 0 ? void 0 : _b.totalAttempts) || 0,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Failed to fetch quiz ${quizId}:`, error);
        }
    }
    return recommendations;
}
// ============================================================
// 🚀 MAIN RAG FUNCTION (Public API)
// ============================================================
/**
 * Optimized RAG Question Answering
 *
 * Pipeline:
 * 1. Hybrid Search (Vector + Keyword với Fast Path)
 * 2. Optional AI Re-ranking
 * 3. Generate Answer
 * 4. Fetch Quiz Recommendations
 */
async function askQuestion(params) {
    const startTime = Date.now();
    const { question, topK = CONFIG.FINAL_TOP_K, targetLang = 'vi', enableRerank = CONFIG.ENABLE_AI_RERANK, } = params;
    // 1. Hybrid Search
    const searchResult = await hybridSearch(question, CONFIG.VECTOR_TOP_K);
    let contexts = searchResult.results;
    // 2. Categorize by confidence
    const { results: filteredResults, confidence, warning } = (0, hybridSearch_1.categorizeByConfidence)(contexts.map(c => (Object.assign(Object.assign({}, c), { score: c.score }))), topK);
    contexts = filteredResults;
    // 3. Optional AI Re-ranking (only for medium/low confidence)
    if (enableRerank && confidence !== 'high' && contexts.length > topK) {
        console.log('🔄 Applying AI Re-ranking...');
        const chatModel = getChatModel();
        // Token-optimized: chỉ gửi title + summary cho AI
        const reranked = await (0, hybridSearch_1.aiRerank)(question, contexts.map(c => ({
            text: c.summary || c.text.substring(0, 150),
            title: c.title,
            chunkId: c.chunkId,
            quizId: c.quizId,
            score: c.score,
        })), chatModel, topK);
        contexts = reranked.map(r => ({
            chunkId: r.chunkId,
            quizId: r.quizId,
            title: r.title,
            text: r.text,
            summary: r.text,
            score: r.rerankScore,
        }));
    }
    // 4. Generate answer
    const { answer, tokensUsed } = await generateAnswer(question, contexts, targetLang);
    // 5. Extract citations and quiz IDs
    const citations = contexts.map(ctx => ({
        title: ctx.title,
        quizId: ctx.quizId,
    }));
    const uniqueQuizIds = [...new Set(contexts.map(ctx => ctx.quizId).filter((id) => id != null))];
    // 6. Fetch quiz recommendations
    const quizRecommendations = await fetchQuizDetails(uniqueQuizIds);
    return {
        answer: warning ? `⚠️ ${warning}\n\n${answer}` : answer,
        citations,
        quizRecommendations: quizRecommendations.length > 0 ? quizRecommendations : undefined,
        usedChunks: contexts.length,
        processingTime: Date.now() - startTime,
        tokensUsed,
        searchMetrics: {
            fastPathUsed: searchResult.fastPathUsed,
            avgScore: searchResult.avgScore,
            topScore: searchResult.topScore,
            confidence,
            rewriteQueries: searchResult.rewriteQueries,
        },
    };
}
exports.askQuestion = askQuestion;
// ============================================================
// 📝 RACE CONDITION WARNING (Ghi chú cho Phase 2)
// ============================================================
/**
 * ⚠️ RACE CONDITION WARNING
 *
 * Khi dùng Firestore Triggers để auto-update index:
 * - Nếu Admin A duyệt Quiz 1
 * - Admin B duyệt Quiz 2 cùng lúc
 * - Cả 2 functions cùng tải file index.json về
 * - Thêm quiz của mình vào, rồi ghi đè lên nhau
 * → Mất dữ liệu của 1 người
 *
 * GIẢI PHÁP CHO PHASE 2:
 * 1. Firestore Lock: Dùng transaction với lock document
 * 2. Update Queue: Dùng Cloud Tasks để queue updates
 * 3. Atomic Updates: Tách index thành nhiều files nhỏ
 *
 * HIỆN TẠI:
 * - Chấp nhận rủi ro nhỏ (tần suất admin duyệt cùng lúc rất thấp)
 * - Khi scale to thì cần implement locking
 */
//# sourceMappingURL=optimizedRAG.js.map