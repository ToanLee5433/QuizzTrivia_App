"use strict";
/**
 * 🚀 AI Learning Consultant v4.2 - Contextual RAG System
 *
 * MASTER PLAN IMPLEMENTATION:
 * ═══════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE: Multi-Agent System with Conversation Memory
 * ┌─────────────────────────────────────────────────────────────┐
 * │  User Input + History → Query Rewriter → Refined Query     │
 * │                              ↓                              │
 * │  Refined Query → Router Agent → [Search/Planner/Chat]      │
 * │                              ↓                              │
 * │  Planner Agent → multiSearch (Parallel) → Synthesizer      │
 * │                              ↓                              │
 * │  Output: Rich Answer + Quiz Cards (Context-Aware!)         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * v4.2 NEW: Contextual Query Rewriting
 * - Client sends last 5 messages as history
 * - Server rewrites ambiguous queries before search
 * - "Thế còn Toán?" → "Gợi ý lộ trình học môn Toán"
 *
 * GIAI ĐOẠN 1: ✅ Hạ tầng tìm kiếm (Global Cache + multiSearch)
 * GIAI ĐOẠN 2: ✅ Router Agent (SEARCH/PLAN/CHAT classification)
 * GIAI ĐOẠN 3: ✅ Planner Agent (Skeleton + Mapping)
 * GIAI ĐOẠN 4: ✅ Auto-Tagging (Trigger-based, separate file)
 * GIAI ĐOẠN 5: ✅ Synthesis & UI (Advisor prompt + Gap detection)
 * GIAI ĐOẠN 6: ✅ Contextual Query Rewriting (v4.2)
 *
 * RISK MANAGEMENT:
 * - Latency: Gemini Flash-Lite + Promise.all parallel search
 * - AI Hallucination: Few-shot prompting + strict JSON output
 * - Token Cost: Optimized prompts, JSON-only responses
 * - Missing Quiz: Honest "no data" reporting
 * - Stateless Context: Query rewriting solves "mất trí nhớ"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.askQuestion = exports.invalidateGlobalCache = void 0;
const generative_ai_1 = require("@google/generative-ai");
const admin = require("firebase-admin");
const storage_1 = require("firebase-admin/storage");
const hybridSearch_1 = require("../lib/hybridSearch");
const oramaEngine_1 = require("./oramaEngine");
// ============================================================
// 🔥 GLOBAL VARIABLE CACHING (Warm Instance Optimization)
// ============================================================
// Khai báo biến Global (nằm ngoài hàm export)
// Sẽ được giữ lại giữa các lần gọi (Warm Instance)
let globalVectorIndex = null;
let globalIndexLoadTime = 0;
let globalGenAI = null;
// Orama search mode flag - can be toggled via env variable
const USE_ORAMA_SEARCH = process.env.RAG_USE_ORAMA !== 'false';
// Cache TTL: 5 phút (configurable)
const INDEX_CACHE_TTL_MS = 5 * 60 * 1000;
// Suppress unused warning - AgentIntent is for documentation
const _agentIntentDoc = 'SEARCH';
void _agentIntentDoc;
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
    // NEW v3.0: Learning Path Settings
    ENABLE_LEARNING_PATH: process.env.RAG_ENABLE_LEARNING_PATH !== 'false',
    MAX_SUBTOPICS: parseInt(process.env.RAG_MAX_SUBTOPICS || '6'),
    QUIZZES_PER_TOPIC: parseInt(process.env.RAG_QUIZZES_PER_TOPIC || '3'),
    // NEW v4.1: Intent confidence threshold (below this = unclear)
    INTENT_CONFIDENCE_THRESHOLD: parseFloat(process.env.RAG_INTENT_CONFIDENCE || '0.65'),
    // NEW v4.1: Enable analytics logging
    ENABLE_ANALYTICS: process.env.RAG_ENABLE_ANALYTICS !== 'false',
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
// ============================================================
// 🔄 CONTEXTUAL QUERY REWRITING (v4.2 - Giải quyết "mất trí nhớ")
// ============================================================
/**
 * Viết lại câu hỏi dựa trên ngữ cảnh hội thoại
 *
 * VẤN ĐỀ: Câu hỏi như "Thế còn Toán?" không có đủ thông tin để tìm kiếm
 * GIẢI PHÁP: Dùng AI để viết lại thành "Gợi ý lộ trình học môn Toán"
 *
 * @param question - Câu hỏi hiện tại (có thể thiếu ngữ cảnh)
 * @param history - Lịch sử hội thoại (tối đa 5 tin nhắn gần nhất)
 * @returns Câu hỏi đã được viết lại đầy đủ ý nghĩa
 *
 * Latency: ~200-300ms với Gemini Flash Lite
 */
async function contextualizeQuery(question, history) {
    // Nếu không có history hoặc history trống, giữ nguyên câu hỏi
    if (!history || history.length === 0) {
        return { refinedQuestion: question, wasRewritten: false };
    }
    // Kiểm tra xem câu hỏi có phụ thuộc ngữ cảnh không
    const contextDependentPatterns = [
        /^(thế|vậy|còn|với|và|như)/i,
        /^(nó|cái (đó|này|kia)|họ|chúng)/i,
        /^(tại sao|vì sao|sao)\??$/i,
        /^(ví dụ|cho tôi ví dụ)\??$/i,
        /^(chi tiết|giải thích)\??$/i,
        /^(tất cả|tôi muốn tất cả|all)/i,
        /thì sao\??$/i,
        /^.{1,20}$/, // Câu quá ngắn (< 20 ký tự)
    ];
    const needsRewriting = contextDependentPatterns.some(pattern => pattern.test(question.trim()));
    if (!needsRewriting) {
        // Câu hỏi đã đủ rõ ràng
        return { refinedQuestion: question, wasRewritten: false };
    }
    console.log(`🔄 Query needs contextualizing: "${question}"`);
    try {
        const model = getChatModel();
        // Format history cho prompt - focus on user's previous topic
        const historyText = history
            .slice(-5) // Chỉ lấy 5 tin nhắn gần nhất
            .map(m => `${m.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${m.content.substring(0, 200)}`)
            .join('\n');
        const prompt = `Nhiệm vụ: Viết lại câu hỏi cuối cùng của người dùng thành một câu độc lập, đầy đủ ý nghĩa để hệ thống tìm kiếm quiz và tài liệu học tập hiểu được.

Lịch sử hội thoại:
${historyText}

Câu hỏi hiện tại: "${question}"

Quy tắc:
1. Nếu người dùng hỏi về một môn học/chủ đề MỚI (ví dụ: "Văn thì sao?", "Còn Lý?"), hãy viết thành: "Tìm quiz và tài liệu về [Môn học]" hoặc "Gợi ý lộ trình học [Môn học]"
2. Nếu người dùng muốn so sánh/thay đổi chủ đề, hãy viết rõ chủ đề mới.
3. Giữ nguyên ý định gốc: tìm quiz, học lộ trình, hay hỏi kiến thức.
4. Chỉ trả về câu hỏi đã viết lại, KHÔNG giải thích thêm.

Ví dụ:
- "Văn thì sao?" → "Tìm quiz và gợi ý lộ trình học môn Văn học"
- "Còn Toán?" → "Tìm quiz và tài liệu về môn Toán"
- "Tôi muốn tất cả" → "[Dựa vào context để xác định muốn tất cả gì]"

Câu hỏi đã viết lại:`;
        const result = await model.generateContent(prompt);
        const refinedQuestion = result.response.text().trim();
        // Validate output
        if (!refinedQuestion || refinedQuestion.length < 3 || refinedQuestion.length > 300) {
            console.log('⚠️ Query rewriting produced invalid output, using original');
            return { refinedQuestion: question, wasRewritten: false };
        }
        console.log(`✅ Query rewritten: "${question}" → "${refinedQuestion}"`);
        return { refinedQuestion, wasRewritten: true };
    }
    catch (error) {
        console.error('❌ Query contextualization failed:', error);
        // Fallback: Giữ nguyên câu hỏi gốc
        return { refinedQuestion: question, wasRewritten: false };
    }
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
        // Use explicit bucket name to ensure correct bucket is used
        const bucket = (0, storage_1.getStorage)().bucket('datn-quizapp.firebasestorage.app');
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
 * Also invalidates Orama cache to ensure consistency
 */
function invalidateGlobalCache() {
    globalVectorIndex = null;
    globalIndexLoadTime = 0;
    // Also invalidate Orama cache
    (0, oramaEngine_1.invalidateOramaCache)();
    console.log('🗑️ Global index cache invalidated (JSON + Orama)');
}
exports.invalidateGlobalCache = invalidateGlobalCache;
// ============================================================
// 🧠 GIAI ĐOẠN 2: ROUTER AGENT (Bộ não phân loại)
// Master Plan: Phân loại SEARCH / PLAN / CHAT
// ============================================================
/**
 * Router Agent: Phân loại ý định người dùng
 *
 * 6 nhóm chính (v4.1 Enhanced):
 * - SEARCH: Tìm quiz cụ thể, hỏi đáp nhanh → Vector Search
 * - PLAN: Lộ trình học tập, chủ đề rộng → Planner Agent
 * - CHAT: Xã giao, trò chuyện → Direct response
 * - HELP: Hướng dẫn sử dụng chatbot → Help response
 * - UNCLEAR: Không rõ ý định → Hỏi lại để làm rõ
 *
 * FEW-SHOT PROMPTING để đảm bảo output 100% JSON
 */
async function classifyIntent(question) {
    const model = getChatModel();
    const prompt = `Bạn là Router Agent - hệ thống phân loại ý định người dùng.

**NHIỆM VỤ:** Phân loại câu hỏi vào 1 trong 7 nhóm.

**CÁC NHÓM Ý ĐỊNH:**

1. "quiz_search" (SEARCH) - Tìm quiz về CHỦ ĐỀ CỤ THỂ
   → Đặc điểm: Có từ "quiz", "bài test", "kiểm tra" VÀ có chủ đề cụ thể rõ ràng
   → Ví dụ: "Quiz JavaScript", "Bài test React", "Kiểm tra kiến thức SQL", "Quiz về toán học"

2. "quiz_browse" (BROWSE) - Khám phá quiz KHÔNG có chủ đề cụ thể
   → Đặc điểm: Muốn xem quiz hay, phổ biến, mới, ngẫu nhiên, KHÔNG nói chủ đề cụ thể
   → QUAN TRỌNG: Nếu câu hỏi chứa "quiz" nhưng KHÔNG có chủ đề cụ thể → quiz_browse
   → Ví dụ: "Quiz hay", "Tôi muốn quiz", "Cho tôi xem quiz", "Gợi ý quiz", "Có quiz gì không?", "Tham khảo quiz", "Quiz nào đang hot?", "Tôi muốn 1 số quiz hay"

3. "learning_path" (PLAN) - Lộ trình học, chủ đề rộng
   → Đặc điểm: Dùng từ "học", "lộ trình", "bắt đầu", "trở thành", muốn biết đường đi
   → Ví dụ: "Học lập trình Web", "Lộ trình Backend Dev", "Muốn trở thành Data Scientist"

4. "fact_retrieval" (SEARCH) - Hỏi về khái niệm, định nghĩa
   → Đặc điểm: Câu hỏi "là gì", "như thế nào", cần câu trả lời kiến thức
   → Ví dụ: "React là gì?", "Vòng lặp for hoạt động thế nào?", "OOP có mấy tính chất?"

5. "general_chat" (CHAT) - Xã giao, trò chuyện
   → Đặc điểm: Chào hỏi, cảm ơn, không liên quan học tập
   → Ví dụ: "Xin chào", "Bạn là ai?", "Cảm ơn nhé"

6. "help_support" (HELP) - Cần hướng dẫn sử dụng chatbot
   → Đặc điểm: Hỏi về cách sử dụng, tính năng, gặp khó khăn
   → Ví dụ: "Làm sao để tìm quiz?", "Chatbot này làm được gì?"

7. "unclear" (CLARIFY) - Không hiểu ý định người dùng
   → Đặc điểm: Câu hỏi mơ hồ, thiếu context
   → Ví dụ: "cái này", "ok", "hmm"

**PHÂN BIỆT QUAN TRỌNG:**
- "Quiz hay" → quiz_browse (KHÔNG có chủ đề)
- "Quiz JavaScript hay" → quiz_search (CÓ chủ đề: JavaScript)
- "Tôi muốn quiz" → quiz_browse (KHÔNG có chủ đề)
- "Tôi muốn quiz về Python" → quiz_search (CÓ chủ đề: Python)
- "Cho tôi 1 số quiz" → quiz_browse (KHÔNG có chủ đề)
- "Quiz toán" → quiz_search (CÓ chủ đề: Toán)

**VÍ DỤ PHÂN LOẠI (FEW-SHOT):**

Input: "Tôi muốn 1 số quiz hay"
Output: {"intent": "quiz_browse", "confidence": 0.95, "extractedTopic": null, "reasoning": "Muốn quiz hay, KHÔNG có chủ đề cụ thể"}

Input: "Quiz hay"
Output: {"intent": "quiz_browse", "confidence": 0.92, "extractedTopic": null, "reasoning": "Muốn quiz hay, không chỉ định chủ đề"}

Input: "Cho tôi quiz"
Output: {"intent": "quiz_browse", "confidence": 0.90, "extractedTopic": null, "reasoning": "Muốn quiz, không có chủ đề cụ thể"}

Input: "Gợi ý quiz cho tôi"
Output: {"intent": "quiz_browse", "confidence": 0.92, "extractedTopic": null, "reasoning": "Muốn gợi ý quiz, không cụ thể chủ đề"}

Input: "Quiz JavaScript cơ bản"
Output: {"intent": "quiz_search", "confidence": 0.98, "extractedTopic": "JavaScript", "reasoning": "Tìm quiz CÓ chủ đề cụ thể: JavaScript"}

Input: "Quiz về toán học"
Output: {"intent": "quiz_search", "confidence": 0.95, "extractedTopic": "Toán học", "reasoning": "Tìm quiz CÓ chủ đề cụ thể: Toán học"}

Input: "Tôi muốn học lập trình web từ đầu"
Output: {"intent": "learning_path", "confidence": 0.95, "extractedTopic": "Web Development", "reasoning": "Dùng từ 'muốn học' + chủ đề rộng"}

Input: "REST API là gì?"
Output: {"intent": "fact_retrieval", "confidence": 0.90, "extractedTopic": "REST API", "reasoning": "Câu hỏi định nghĩa 'là gì'"}

Input: "Xin chào!"
Output: {"intent": "general_chat", "confidence": 0.99, "extractedTopic": null, "reasoning": "Chào hỏi xã giao"}

**CÂU HỎI CẦN PHÂN LOẠI:**
"${question}"

**TRẢ VỀ JSON (KHÔNG có markdown, chỉ JSON thuần):**`;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        // Parse JSON (loại bỏ markdown nếu có)
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        // NEW v4.1: Check confidence threshold - if too low, mark as unclear
        if (parsed.confidence < CONFIG.INTENT_CONFIDENCE_THRESHOLD && parsed.intent !== 'unclear') {
            console.log(`⚠️ Low confidence (${parsed.confidence}), marking as unclear`);
            return {
                intent: 'unclear',
                confidence: parsed.confidence,
                extractedTopic: parsed.extractedTopic,
                reasoning: `Original intent "${parsed.intent}" had low confidence`,
                clarifyingQuestion: generateClarifyingQuestion(question, parsed.intent),
            };
        }
        console.log(`🎯 Router Agent Result:`, {
            question: question.substring(0, 50),
            intent: parsed.intent,
            confidence: parsed.confidence,
            topic: parsed.extractedTopic,
        });
        return parsed;
    }
    catch (error) {
        console.error('❌ Router Agent failed, defaulting to quiz_search:', error);
        return {
            intent: 'quiz_search',
            confidence: 0.5,
            reasoning: 'Fallback do lỗi phân tích',
        };
    }
}
/**
 * Generate clarifying question based on detected partial intent
 */
function generateClarifyingQuestion(question, partialIntent) {
    switch (partialIntent) {
        case 'quiz_search':
            return `Bạn muốn tìm quiz về chủ đề gì cụ thể? Ví dụ: "Quiz JavaScript", "Bài test Python"`;
        case 'learning_path':
            return `Bạn muốn học về chủ đề gì? Hãy cho mình biết cụ thể như "Học Web Development" hoặc "Lộ trình Machine Learning"`;
        case 'fact_retrieval':
            return `Bạn muốn tìm hiểu về khái niệm gì? Ví dụ: "React là gì?", "OOP có những tính chất nào?"`;
        default:
            return `Mình chưa hiểu rõ câu hỏi của bạn. Bạn có thể:\n- Tìm quiz: "Quiz về [chủ đề]"\n- Học lộ trình: "Tôi muốn học [chủ đề]"\n- Hỏi kiến thức: "[Khái niệm] là gì?"`;
    }
}
/**
 * Generate help/support response
 */
function generateHelpResponse() {
    return `🤖 **Xin chào! Mình là AI Learning Assistant**

Mình có thể giúp bạn:

🔍 **Tìm Quiz**
   → "Quiz về JavaScript" / "Bài test React"
   
📚 **Lộ trình học tập**
   → "Tôi muốn học Web Development từ đầu"
   → "Lộ trình trở thành Data Scientist"
   
💡 **Giải thích kiến thức**
   → "REST API là gì?"
   → "OOP có những tính chất nào?"

⚙️ **Mẹo sử dụng:**
- Nói rõ chủ đề bạn quan tâm
- Hỏi càng cụ thể, câu trả lời càng chính xác
- Có thể hỏi bằng tiếng Việt hoặc tiếng Anh

💬 **Bắt đầu ngay:** Bạn muốn tìm quiz hay học về chủ đề gì?`;
}
// ============================================================
// 📋 GIAI ĐOẠN 3: PLANNER AGENT (Tác nhân lập kế hoạch)
// Master Plan: Skeleton Generation + Mapping
// v4.1: Added depth customization + save to Firestore
// ============================================================
/**
 * Get step count based on learning depth
 */
function getStepCountForDepth(depth) {
    switch (depth) {
        case 'basic': return 3;
        case 'intermediate': return 5;
        case 'advanced': return 7;
        case 'expert': return 10;
        default: return 5;
    }
}
/**
 * Save learning plan to Firestore for user
 */
async function saveLearningPlanToFirestore(userId, plan, question) {
    try {
        const docRef = await admin.firestore().collection('learningPlans').add({
            userId,
            question,
            plan,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
        });
        console.log(`📁 Learning plan saved: ${docRef.id}`);
        return docRef.id;
    }
    catch (error) {
        console.error('Failed to save learning plan:', error);
        return '';
    }
}
/**
 * AI Planner Agent: Vẽ "khung xương" lộ trình học tập
 *
 * Input: "Web Development"
 * Output: Danh sách các bước học với từ khóa để search
 *
 * v4.1 Enhancement:
 * - Customizable depth (basic/intermediate/advanced/expert)
 * - Optional save to Firestore
 *
 * FEW-SHOT PROMPTING để tránh AI "bịa" lộ trình sai
 */
async function generateLearningPlan(topic, options) {
    const model = getChatModel();
    const depth = (options === null || options === void 0 ? void 0 : options.depth) || 'intermediate';
    const stepCount = getStepCountForDepth(depth);
    const depthDescription = {
        basic: 'cơ bản, chỉ những kiến thức nền tảng nhất',
        intermediate: 'trung cấp, bao gồm kiến thức cốt lõi và một số chủ đề nâng cao',
        advanced: 'nâng cao, bao gồm cả kiến thức chuyên sâu và best practices',
        expert: 'chuyên sâu, bao gồm tất cả khía cạnh và edge cases',
    };
    const prompt = `Bạn là chuyên gia tư vấn học tập. Đóng vai một Mentor giàu kinh nghiệm.

**NHIỆM VỤ:** Tạo lộ trình học "${topic}" với ${stepCount} bước - MỨC ĐỘ: ${depth.toUpperCase()} (${depthDescription[depth]}).

**QUY TẮC QUAN TRỌNG:**
1. Chỉ liệt kê các kỹ năng/công nghệ CỐT LÕI, phổ biến
2. Thứ tự từ cơ bản đến nâng cao
3. Mỗi bước phải có 1 từ khóa ngắn gọn để tìm kiếm quiz
4. KHÔNG bịa ra công nghệ không phổ biến
5. Điều chỉnh độ chi tiết theo mức ${depth}

**VÍ DỤ MẪU (FEW-SHOT) - Mức INTERMEDIATE:**

Input: "Web Development"
Output:
{
  "mainTopic": "Web Development",
  "depth": "intermediate",
  "steps": [
    {"order": 1, "keyword": "HTML CSS", "title": "Nền tảng HTML & CSS", "description": "Cấu trúc và giao diện web cơ bản", "importance": "essential"},
    {"order": 2, "keyword": "JavaScript", "title": "JavaScript Cơ bản", "description": "Lập trình tương tác cho web", "importance": "essential"},
    {"order": 3, "keyword": "React", "title": "React Framework", "description": "Xây dựng UI component-based", "importance": "recommended"},
    {"order": 4, "keyword": "Node.js", "title": "Backend với Node.js", "description": "Server-side JavaScript", "importance": "recommended"},
    {"order": 5, "keyword": "SQL Database", "title": "Database & SQL", "description": "Quản lý dữ liệu", "importance": "essential"}
  ],
  "prerequisites": ["Kiến thức máy tính cơ bản", "Tư duy logic"],
  "estimatedTime": "6-12 tháng"
}

**VÍ DỤ MẪU - Mức BASIC (3 bước):**

Input: "Web Development"
Output:
{
  "mainTopic": "Web Development",
  "depth": "basic",
  "steps": [
    {"order": 1, "keyword": "HTML CSS", "title": "HTML & CSS Cơ bản", "description": "Nền tảng web", "importance": "essential"},
    {"order": 2, "keyword": "JavaScript", "title": "JavaScript Cơ bản", "description": "Lập trình cơ bản", "importance": "essential"},
    {"order": 3, "keyword": "React", "title": "Framework Đầu tiên", "description": "Bắt đầu với React", "importance": "recommended"}
  ],
  "prerequisites": ["Máy tính cơ bản"],
  "estimatedTime": "3-6 tháng"
}

**BÂY GIỜ TẠO LỘ TRÌNH CHO:** "${topic}"
**MỨC ĐỘ:** ${depth.toUpperCase()} (${stepCount} bước)

**TRẢ VỀ JSON (KHÔNG có markdown code block, chỉ JSON thuần):**`;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        // Parse JSON (loại bỏ markdown nếu có)
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const rawPlan = JSON.parse(jsonStr);
        // Normalize và validate plan
        const plan = {
            mainTopic: rawPlan.mainTopic || topic,
            steps: (rawPlan.steps || []).map((s, idx) => ({
                order: s.order || idx + 1,
                keyword: s.keyword || '',
                title: s.title || s.keyword || '',
                description: s.description || '',
                importance: s.importance || 'recommended',
            })),
            prerequisites: rawPlan.prerequisites || [],
            estimatedTime: rawPlan.estimatedTime,
            // Generate backward-compatible fields
            subTopics: (rawPlan.steps || []).map((s) => s.keyword || s.title),
            learningOrder: (rawPlan.steps || []).map((s) => s.keyword || s.title),
        };
        console.log(`📋 Planner Agent - Learning Plan for "${topic}" (${depth}):`, {
            steps: plan.steps.length,
            keywords: plan.steps.map(s => s.keyword),
        });
        // NEW v4.1: Save to Firestore if requested
        if ((options === null || options === void 0 ? void 0 : options.saveToFirestore) && (options === null || options === void 0 ? void 0 : options.userId)) {
            await saveLearningPlanToFirestore(options.userId, plan, topic);
        }
        return plan;
    }
    catch (error) {
        console.error('❌ Planner Agent failed:', error);
        // Fallback: trả về chủ đề gốc như 1 step
        return {
            mainTopic: topic,
            steps: [{
                    order: 1,
                    keyword: topic,
                    title: topic,
                    description: `Học về ${topic}`,
                    importance: 'essential',
                }],
            prerequisites: [],
            subTopics: [topic],
            learningOrder: [topic],
        };
    }
}
// ============================================================
// 🔄 STEP 3: MULTI-HOP RETRIEVAL (Tìm kiếm đa luồng)
// ============================================================
/**
 * Tìm kiếm song song cho nhiều sub-topics
 *
 * Mỗi sub-topic sẽ được search độc lập và kết quả được nhóm theo topic
 */
async function multiHopRetrieval(subTopics, quizzesPerTopic = CONFIG.QUIZZES_PER_TOPIC) {
    const resultsByTopic = new Map();
    console.log(`🔄 Multi-hop Retrieval: Searching ${subTopics.length} sub-topics...`);
    // Search song song cho tất cả sub-topics
    const searchPromises = subTopics.map(async (topic) => {
        try {
            // Generate embedding cho topic
            const topicEmbedding = await generateEmbedding(topic);
            // Vector search with Orama hybrid support
            const results = await vectorSearch(topicEmbedding, quizzesPerTopic * 2, topic);
            // Filter kết quả có score đủ tốt
            const filtered = results.filter(r => r.score >= CONFIG.MIN_RELEVANCE_SCORE);
            console.log(`   📚 "${topic}": Found ${filtered.length} relevant results`);
            // NEW v4.1: Return alternative resources suggestion if no quiz found
            return {
                topic,
                results: filtered.slice(0, quizzesPerTopic),
                hasResults: filtered.length > 0,
            };
        }
        catch (error) {
            console.error(`   ❌ Search failed for topic "${topic}":`, error);
            return { topic, results: [], hasResults: false };
        }
    });
    const allResults = await Promise.all(searchPromises);
    // Nhóm kết quả theo topic
    for (const { topic, results } of allResults) {
        resultsByTopic.set(topic, results);
    }
    // NEW v4.1: Log coverage statistics
    const totalTopics = subTopics.length;
    const coveredTopics = allResults.filter(r => r.hasResults).length;
    console.log(`📊 Multi-hop Coverage: ${coveredTopics}/${totalTopics} topics have quiz content`);
    return resultsByTopic;
}
/**
 * Generate alternative learning resources for missing topics
 */
function generateAlternativeResources(missingTopics) {
    if (missingTopics.length === 0)
        return '';
    const resources = missingTopics.map(topic => {
        const searchQuery = encodeURIComponent(topic);
        return `
📖 **${topic}:**
   - 🎥 YouTube: https://youtube.com/results?search_query=${searchQuery}+tutorial
   - 📚 Coursera/Udemy: Tìm "${topic}" 
   - 📝 MDN/W3Schools: Tài liệu tham khảo`;
    }).join('\n');
    return `
---
📚 **Tài liệu bổ sung (Chưa có quiz trong hệ thống):**
${resources}`;
}
// ============================================================
// 🎯 GIAI ĐOẠN 5: SYNTHESIZER (Tổng hợp lộ trình)
// Master Plan: Advisor prompt + Gap detection
// v4.1: Enhanced formatting + Suggested next actions
// ============================================================
/**
 * Synthesizer Agent: Tổng hợp kết quả thành lời khuyên tự nhiên
 *
 * QUAN TRỌNG (Risk Management):
 * - Phải trung thực khi không có quiz
 * - KHÔNG bịa ra quiz không tồn tại
 * - Gợi ý tìm tài liệu ngoài nếu thiếu
 *
 * v4.1 Enhancement:
 * - Better markdown formatting
 * - Suggested next questions
 * - Alternative resources for missing topics
 */
async function synthesizeLearningPath(question, plan, quizzesByTopic) {
    var _a;
    const model = getChatModel();
    // Build context về các quiz đã tìm thấy + Gap detection
    let quizContext = '';
    let stepsWithQuiz = 0;
    let stepsWithoutQuiz = 0;
    const missingTopics = [];
    for (const [topic, quizzes] of quizzesByTopic) {
        if (quizzes.length > 0) {
            stepsWithQuiz++;
            quizContext += `\n\n✅ **${topic}:** CÓ ${quizzes.length} quiz\n`;
            quizzes.forEach((quiz, idx) => {
                quizContext += `   - Quiz ${idx + 1}: "${quiz.title}" (${quiz.difficulty}, ${quiz.questionCount} câu)\n`;
            });
        }
        else {
            stepsWithoutQuiz++;
            missingTopics.push(topic);
            quizContext += `\n\n⚠️ **${topic}:** CHƯA CÓ quiz trong hệ thống\n`;
        }
    }
    // Coverage statistics
    const totalSteps = stepsWithQuiz + stepsWithoutQuiz;
    const coveragePercent = totalSteps > 0 ? Math.round((stepsWithQuiz / totalSteps) * 100) : 0;
    // Generate suggested follow-up questions
    const suggestedQuestions = generateSuggestedQuestions(plan.mainTopic, plan.steps);
    const prompt = `Bạn là AI Learning Advisor - Cố vấn học tập thông minh và TRUNG THỰC.

**NHIỆM VỤ:** Tổng hợp lộ trình học "${plan.mainTopic}" cho người dùng.

**CÂU HỎI GỐC:** "${question}"

**KẾ HOẠCH HỌC TẬP (${plan.steps.length} bước):**
${plan.steps.map((s, i) => `${i + 1}. ${s.title} - ${s.description} (${s.importance})`).join('\n')}
${((_a = plan.prerequisites) === null || _a === void 0 ? void 0 : _a.length) ? `\n📋 Kiến thức tiên quyết: ${plan.prerequisites.join(', ')}` : ''}
${plan.estimatedTime ? `⏱️ Thời gian ước tính: ${plan.estimatedTime}` : ''}

**DỮ LIỆU QUIZ TRONG HỆ THỐNG:**
${quizContext}

📊 **ĐỘ BAO PHỦ:** ${stepsWithQuiz}/${totalSteps} bước có quiz (${coveragePercent}%)
${missingTopics.length > 0 ? `⚠️ **THIẾU QUIZ CHO:** ${missingTopics.join(', ')}` : ''}

**YÊU CẦU TRẢ LỜI (QUAN TRỌNG):**

1. **Mở đầu:** Chào thân thiện, giới thiệu lộ trình ${plan.mainTopic}

2. **Từng giai đoạn:**
   - Giải thích TẠI SAO cần học (không chỉ liệt kê)
   - Nếu CÓ quiz: Nói "Dưới đây có quiz để luyện tập"
   - Nếu KHÔNG CÓ quiz: TRUNG THỰC nói "Hiện chưa có quiz, bạn có thể tìm tài liệu trên YouTube/Udemy"

3. **Kết thúc:** 
   - Nếu coverage > 70%: Khuyến khích bắt đầu ngay
   - Nếu coverage < 50%: Thành thật xin lỗi vì dữ liệu còn hạn chế
   - Thêm phần "💭 Bạn có thể hỏi thêm:" với các gợi ý câu hỏi

4. **QUY TẮC VÀNG:**
   - KHÔNG bịa ra quiz không tồn tại
   - KHÔNG liệt kê chi tiết quiz (sẽ hiển thị tự động)
   - Dùng emoji cho sinh động
   - Giữ tone thân thiện, động viên
   - Kết thúc bằng gợi ý câu hỏi liên quan

**ĐỊNH DẠNG:**
🎯 **Lộ trình ${plan.mainTopic}**

📚 **Bước 1: [Tên]** - [Tại sao quan trọng]
[Quiz status + gợi ý]

📚 **Bước 2: [Tên]** - [Tại sao quan trọng]
[Quiz status + gợi ý]

💡 **Lời khuyên:** [Tips thực tế]

🚀 **Bắt đầu từ đâu?**

💭 **Bạn có thể hỏi thêm:**
${suggestedQuestions}`;
    try {
        let response = await model.generateContent(prompt);
        let answer = response.response.text();
        // NEW v4.1: Append alternative resources if there are missing topics
        if (missingTopics.length > 0) {
            answer += generateAlternativeResources(missingTopics);
        }
        return answer;
    }
    catch (error) {
        console.error('❌ Synthesizer Agent failed:', error);
        // Fallback response - honest about limitations
        const stepsList = plan.steps.map((s, idx) => `${idx + 1}. ${s.title || s.keyword}`).join('\n');
        let fallback = `🎯 **Lộ trình học ${plan.mainTopic}**

Để thành thạo ${plan.mainTopic}, bạn nên học theo thứ tự:
${stepsList}

📊 Hiện có ${stepsWithQuiz}/${totalSteps} bước có quiz trong hệ thống.
${missingTopics.length > 0 ? `\n⚠️ Chưa có quiz cho: ${missingTopics.join(', ')}. Bạn có thể tìm thêm tài liệu ngoài.` : ''}

📚 Dưới đây là các quiz phù hợp cho từng giai đoạn. Bạn muốn bắt đầu từ đâu?

💭 **Bạn có thể hỏi thêm:**
${suggestedQuestions}`;
        if (missingTopics.length > 0) {
            fallback += generateAlternativeResources(missingTopics);
        }
        return fallback;
    }
}
/**
 * Generate suggested follow-up questions based on learning plan
 */
function generateSuggestedQuestions(mainTopic, steps) {
    const suggestions = [];
    // Suggest quiz for first step
    if (steps.length > 0) {
        suggestions.push(`- "Quiz về ${steps[0].keyword}"`);
    }
    // Suggest concept explanation for a step
    if (steps.length > 1) {
        suggestions.push(`- "${steps[1].keyword} là gì?"`);
    }
    // Suggest deeper learning path
    suggestions.push(`- "Lộ trình ${mainTopic} nâng cao"`);
    return suggestions.join('\n');
}
// ============================================================
// 🔧 HELPER: Get keywords from plan
// ============================================================
/**
 * Extract searchable keywords from LearningPlan
 */
function getPlanKeywords(plan) {
    // Prefer learningOrder > subTopics > steps.keyword
    if (plan.learningOrder && plan.learningOrder.length > 0) {
        return plan.learningOrder;
    }
    if (plan.subTopics && plan.subTopics.length > 0) {
        return plan.subTopics;
    }
    return plan.steps.map(s => s.keyword);
}
/**
 * Log analytics event to Firestore (non-blocking)
 * v4.1 Fix: Filter out undefined values before saving
 */
function logAnalytics(event) {
    if (!CONFIG.ENABLE_ANALYTICS)
        return;
    // Filter out undefined values to prevent Firestore errors
    const cleanEvent = {};
    for (const [key, value] of Object.entries(event)) {
        if (value !== undefined) {
            cleanEvent[key] = value;
        }
    }
    // Fire-and-forget - don't await
    admin.firestore().collection('chatbot_analytics').add(Object.assign(Object.assign({}, cleanEvent), { createdAt: admin.firestore.FieldValue.serverTimestamp() })).catch(err => {
        console.warn('Failed to log analytics:', err);
    });
}
// ============================================================
// 🎓 FULL LEARNING PATH HANDLER
// ============================================================
/**
 * Xử lý toàn bộ flow Learning Path theo Master Plan
 *
 * Flow: Router → Planner → multiSearch (parallel) → Synthesizer
 *
 * v4.1: Added depth option and save to Firestore
 */
async function handleLearningPath(question, topic, options) {
    console.log(`🎓 Learning Path Handler started for topic: "${topic}" (depth: ${(options === null || options === void 0 ? void 0 : options.depth) || 'intermediate'})`);
    // GIAI ĐOẠN 3: Planner Agent - Generate skeleton with depth option
    const plan = await generateLearningPlan(topic, options);
    const keywords = getPlanKeywords(plan);
    console.log(`📋 Plan keywords: ${keywords.join(', ')}`);
    // GIAI ĐOẠN 1: Multi-hop retrieval (parallel search)
    const resultsByTopic = await multiHopRetrieval(keywords);
    // Map search results to quiz details
    const quizzesByTopic = new Map();
    const allQuizIds = new Set();
    for (const [topicName, results] of resultsByTopic) {
        const quizIds = [...new Set(results.map(r => r.quizId).filter((id) => id != null))];
        const quizzes = await fetchQuizDetails(quizIds);
        quizzesByTopic.set(topicName, quizzes);
        quizIds.forEach(id => allQuizIds.add(id));
    }
    // GIAI ĐOẠN 5: Synthesizer - Generate advisor response
    const answer = await synthesizeLearningPath(question, plan, quizzesByTopic);
    // Flatten all quizzes for recommendations (ordered by learning path)
    const orderedQuizzes = [];
    const addedIds = new Set();
    // Use getPlanKeywords for consistent ordering
    for (const topicName of keywords) {
        const topicQuizzes = quizzesByTopic.get(topicName) || [];
        for (const quiz of topicQuizzes) {
            if (!addedIds.has(quiz.quizId)) {
                orderedQuizzes.push(quiz);
                addedIds.add(quiz.quizId);
            }
        }
    }
    return {
        answer,
        quizRecommendations: orderedQuizzes,
        plan,
    };
}
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
// With Orama Hybrid Search Support
// ============================================================
/**
 * Vector search with dual-mode support:
 * - Orama Mode (default): Hybrid search (Vector + BM25 keyword)
 * - Legacy Mode: Brute-force cosine similarity
 *
 * Toggle via RAG_USE_ORAMA env variable
 */
async function vectorSearch(queryEmbedding, topK = 10, originalQuery // Optional: for Orama hybrid search
) {
    var _a;
    const index = await loadVectorIndex();
    if (!index || index.chunks.length === 0) {
        return [];
    }
    // === ORAMA HYBRID SEARCH (Recommended) ===
    if (USE_ORAMA_SEARCH && originalQuery) {
        try {
            console.log(`🔍 Using Orama Hybrid Search (Vector + Keyword)`);
            const oramaStats = (0, oramaEngine_1.getOramaStats)();
            // Initialize Orama DB if needed
            const oramaDB = await (0, oramaEngine_1.initializeOramaFromIndex)(index);
            // Hybrid search with 60% vector, 40% keyword weight
            const oramaResults = await (0, oramaEngine_1.oramaHybridSearch)(oramaDB, originalQuery, queryEmbedding, topK, 0.6 // vector weight
            );
            console.log(`✅ Orama returned ${oramaResults.length} results (cache: ${oramaStats.cacheValid ? 'HIT' : 'MISS'})`);
            // Convert to SearchResult format
            return oramaResults.map(r => ({
                chunkId: r.chunkId,
                quizId: r.quizId,
                title: r.title,
                text: r.text,
                summary: r.summary,
                score: r.score,
            }));
        }
        catch (oramaError) {
            console.warn('⚠️ Orama search failed, falling back to brute-force:', oramaError);
            // Fall through to legacy search
        }
    }
    // === LEGACY BRUTE-FORCE SEARCH (Fallback) ===
    console.log(`🔍 Using Legacy Brute-Force Search`);
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
    // === STEP 2: FAST PATH - Direct vector search (with Orama hybrid) ===
    const directResults = await vectorSearch(queryEmbedding, topK, query);
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
        const results = await vectorSearch(rewrittenEmbedding, topK, rewrittenQuery);
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
        // IMPORTANT: Preserve original cosine similarity score for confidence categorization
        // RRF score is only used for ranking, not for threshold filtering
        const vectorScoreMap = new Map(vectorResults.results.map(r => [r.chunkId, r.score]));
        const mergedResults = fusedResults.slice(0, topK).map(r => {
            var _a;
            return (Object.assign(Object.assign({}, r), { 
                // Use original vector score if available, otherwise estimate from RRF
                score: (_a = vectorScoreMap.get(r.chunkId)) !== null && _a !== void 0 ? _a : Math.min(r.rrfScore * 30, 0.8) }));
        });
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
 * Strip HTML tags from string
 */
function stripHtmlTags(str) {
    if (!str)
        return '';
    return str
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
}
/**
 * Fetch popular/trending quizzes for browse mode
 * Sorted by: viewCount + totalAttempts (popularity score)
 */
async function fetchPopularQuizzes(limit = 5) {
    var _a, _b, _c, _d, _e, _f;
    const recommendations = [];
    try {
        const quizzesRef = admin.firestore().collection('quizzes');
        // Fetch approved quizzes - simple query without complex ordering
        // Firestore requires composite index for where + orderBy on nested field
        const snapshot = await quizzesRef
            .where('status', '==', 'approved')
            .limit(limit * 3) // Fetch more to sort and filter client-side
            .get();
        if (snapshot.empty) {
            console.log('⚠️ No approved quizzes found');
            return [];
        }
        console.log(`📊 Found ${snapshot.size} approved quizzes`);
        // Collect all quizzes first, then sort by popularity
        const quizzesData = [];
        for (const doc of snapshot.docs) {
            const quizData = doc.data();
            if (!quizData)
                continue;
            // Calculate popularity score
            const viewCount = ((_a = quizData.stats) === null || _a === void 0 ? void 0 : _a.viewCount) || quizData.viewCount || 0;
            const totalAttempts = ((_b = quizData.stats) === null || _b === void 0 ? void 0 : _b.totalAttempts) || quizData.playCount || 0;
            const popularity = viewCount + (totalAttempts * 2); // Weight attempts more
            quizzesData.push({ doc, popularity });
        }
        // Sort by popularity descending
        quizzesData.sort((a, b) => b.popularity - a.popularity);
        // Process top quizzes
        for (const { doc } of quizzesData.slice(0, limit)) {
            const quizData = doc.data();
            if (!quizData)
                continue;
            // Get actual question count
            let questionCount = quizData.questionCount || 0;
            if (questionCount === 0) {
                const questionsSnap = await quizzesRef.doc(doc.id).collection('questions').count().get();
                questionCount = questionsSnap.data().count || 0;
            }
            // Skip quizzes with no questions
            if (questionCount === 0) {
                console.log(`⚠️ Skipping quiz ${doc.id} - no questions`);
                continue;
            }
            // Clean description
            const cleanDescription = stripHtmlTags(quizData.description || '');
            const hasPassword = !!(quizData.password || quizData.accessCode);
            recommendations.push({
                quizId: doc.id,
                title: quizData.title || 'Untitled Quiz',
                description: cleanDescription.substring(0, 150) + (cleanDescription.length > 150 ? '...' : ''),
                imageUrl: quizData.imageUrl || quizData.coverImage || null,
                difficulty: quizData.difficulty || 'medium',
                category: quizData.category || 'Uncategorized',
                questionCount,
                averageRating: ((_c = quizData.stats) === null || _c === void 0 ? void 0 : _c.averageRating) || quizData.averageRating || 0,
                totalAttempts: ((_d = quizData.stats) === null || _d === void 0 ? void 0 : _d.totalAttempts) || quizData.playCount || 0,
                viewCount: ((_e = quizData.stats) === null || _e === void 0 ? void 0 : _e.viewCount) || quizData.viewCount || 0,
                averageScore: ((_f = quizData.stats) === null || _f === void 0 ? void 0 : _f.averageScore) || quizData.averageScore || 0,
                hasPassword,
            });
        }
        console.log(`✅ Fetched ${recommendations.length} popular quizzes`);
        return recommendations;
    }
    catch (error) {
        console.error('❌ Failed to fetch popular quizzes:', error);
        return [];
    }
}
/**
 * Fetch full quiz details for recommendations
 */
async function fetchQuizDetails(quizIds) {
    var _a, _b, _c, _d;
    const recommendations = [];
    const quizzesRef = admin.firestore().collection('quizzes');
    console.log(`📋 fetchQuizDetails called with ${quizIds.length} quiz IDs:`, quizIds.slice(0, 5));
    for (const quizId of quizIds.slice(0, CONFIG.FINAL_TOP_K)) {
        try {
            const quizDoc = await quizzesRef.doc(quizId).get();
            if (quizDoc.exists) {
                const quizData = quizDoc.data();
                console.log(`📖 Quiz ${quizId} exists, status: ${quizData === null || quizData === void 0 ? void 0 : quizData.status}`);
                if (quizData && quizData.status === 'approved') {
                    // Get actual question count from subcollection if not available
                    let questionCount = quizData.questionCount || 0;
                    if (questionCount === 0) {
                        const questionsSnap = await quizzesRef.doc(quizId).collection('questions').count().get();
                        questionCount = questionsSnap.data().count || 0;
                    }
                    // Clean description (strip HTML)
                    const cleanDescription = stripHtmlTags(quizData.description || '');
                    const hasPassword = !!(quizData.password || quizData.accessCode);
                    recommendations.push({
                        quizId,
                        title: quizData.title || 'Untitled Quiz',
                        description: cleanDescription.substring(0, 150) + (cleanDescription.length > 150 ? '...' : ''),
                        imageUrl: quizData.imageUrl || quizData.coverImage || null,
                        difficulty: quizData.difficulty || 'medium',
                        category: quizData.category || 'Uncategorized',
                        questionCount,
                        averageRating: ((_a = quizData.stats) === null || _a === void 0 ? void 0 : _a.averageRating) || quizData.averageRating || 0,
                        totalAttempts: ((_b = quizData.stats) === null || _b === void 0 ? void 0 : _b.totalAttempts) || quizData.playCount || 0,
                        viewCount: ((_c = quizData.stats) === null || _c === void 0 ? void 0 : _c.viewCount) || quizData.viewCount || 0,
                        averageScore: ((_d = quizData.stats) === null || _d === void 0 ? void 0 : _d.averageScore) || quizData.averageScore || 0,
                        hasPassword,
                    });
                }
                else {
                    console.log(`⚠️ Quiz ${quizId} not approved (status: ${quizData === null || quizData === void 0 ? void 0 : quizData.status})`);
                }
            }
            else {
                console.log(`⚠️ Quiz ${quizId} does not exist`);
            }
        }
        catch (error) {
            console.error(`Failed to fetch quiz ${quizId}:`, error);
        }
    }
    console.log(`✅ fetchQuizDetails returning ${recommendations.length} quiz recommendations`);
    return recommendations;
}
// ============================================================
// 🚀 MAIN RAG FUNCTION (Public API)
// ============================================================
/**
 * Optimized RAG Question Answering v4.2 - Contextual RAG
 *
 * NEW Pipeline với Contextual Query Rewriting:
 * 0. Query Contextualization - Viết lại câu hỏi dựa trên history
 * 1. Intent Classification - Xác định ý định người dùng (6 intents)
 * 2a. Learning Path Mode - Nếu muốn học chủ đề rộng
 * 2b. Standard Mode - Nếu hỏi cụ thể/tìm quiz
 * 2c. Help Mode - Nếu cần hướng dẫn sử dụng
 * 2d. Unclear Mode - Nếu không rõ ý định, hỏi lại
 * 3. Generate Answer
 * 4. Fetch Quiz Recommendations
 * 5. Log Analytics (optional)
 *
 * v4.2 NEW: Conversation history support
 * - Client gửi kèm 5 tin nhắn gần nhất
 * - Server viết lại câu hỏi mơ hồ trước khi search
 * - Giải quyết vấn đề "mất trí nhớ ngắn hạn"
 */
async function askQuestion(params) {
    const startTime = Date.now();
    const { question: originalQuestion, topK = CONFIG.FINAL_TOP_K, targetLang = 'vi', enableRerank = CONFIG.ENABLE_AI_RERANK, userId, depth = 'intermediate', history = [], } = params;
    // ============================================================
    // STEP 0: CONTEXTUAL QUERY REWRITING (NEW v4.2)
    // ============================================================
    let question = originalQuestion;
    let queryWasRewritten = false;
    if (history && history.length > 0) {
        console.log(`🔄 Step 0: Contextualizing query with ${history.length} history messages...`);
        const rewriteResult = await contextualizeQuery(originalQuestion, history);
        question = rewriteResult.refinedQuestion;
        queryWasRewritten = rewriteResult.wasRewritten;
        if (queryWasRewritten) {
            console.log(`✅ Query contextualized: "${originalQuestion}" → "${question}"`);
        }
    }
    // ============================================================
    // STEP 1: INTENT CLASSIFICATION (Enhanced in v4.1)
    // ============================================================
    let intentResult = null;
    if (CONFIG.ENABLE_LEARNING_PATH) {
        console.log('🧠 Step 1: Classifying user intent...');
        // Use the contextualized question for better intent classification
        intentResult = await classifyIntent(question);
        // Log analytics if enabled
        if (CONFIG.ENABLE_ANALYTICS) {
            logAnalytics({
                type: 'intent_classification',
                userId,
                question: question.substring(0, 100),
                intent: intentResult.intent,
                confidence: intentResult.confidence,
                timestamp: Date.now(),
            });
        }
        // Handle Help/Support intent
        if (intentResult.intent === 'help_support') {
            console.log('❓ Help/Support mode');
            return {
                answer: generateHelpResponse(),
                citations: [],
                quizRecommendations: undefined,
                usedChunks: 0,
                processingTime: Date.now() - startTime,
                tokensUsed: { input: 0, output: 0 },
                searchMetrics: {
                    fastPathUsed: true,
                    avgScore: 0,
                    topScore: 0,
                    confidence: 'none',
                    queryRewritten: queryWasRewritten,
                    originalQuery: queryWasRewritten ? originalQuestion : undefined,
                },
            };
        }
        // Handle Unclear intent - ask for clarification
        // BUT: If query was rewritten successfully, don't ask for clarification
        if (intentResult.intent === 'unclear' && !queryWasRewritten) {
            console.log('🤔 Unclear intent - asking for clarification');
            const clarifyingQuestion = intentResult.clarifyingQuestion ||
                'Mình chưa hiểu rõ câu hỏi của bạn. Bạn có thể nói cụ thể hơn được không?';
            return {
                answer: `🤔 ${clarifyingQuestion}\n\n💡 **Gợi ý:**\n- Tìm quiz: "Quiz về JavaScript"\n- Học lộ trình: "Tôi muốn học Web Development"\n- Hỏi kiến thức: "React là gì?"`,
                citations: [],
                quizRecommendations: undefined,
                usedChunks: 0,
                processingTime: Date.now() - startTime,
                tokensUsed: { input: 0, output: 0 },
                searchMetrics: {
                    fastPathUsed: true,
                    avgScore: 0,
                    topScore: 0,
                    confidence: 'none',
                    queryRewritten: false,
                },
            };
        }
        // Handle Quiz Browse intent - show popular/trending quizzes without specific topic
        // ALSO: Treat quiz_search without extractedTopic as quiz_browse (fallback)
        const shouldBrowseQuizzes = intentResult.intent === 'quiz_browse' ||
            (intentResult.intent === 'quiz_search' && !intentResult.extractedTopic);
        if (shouldBrowseQuizzes) {
            console.log('🔥 Quiz Browse mode - fetching popular quizzes (intent:', intentResult.intent, ')');
            try {
                const popularQuizzes = await fetchPopularQuizzes(CONFIG.FINAL_TOP_K);
                const processingTime = Date.now() - startTime;
                if (popularQuizzes.length === 0) {
                    return {
                        answer: `Chào bạn! 😊 Hiện tại hệ thống chưa có quiz nào được duyệt. Hãy quay lại sau nhé!\n\n💡 **Gợi ý:** Bạn có thể tự tạo quiz mới để chia sẻ với cộng đồng.`,
                        citations: [],
                        quizRecommendations: undefined,
                        usedChunks: 0,
                        processingTime,
                        tokensUsed: { input: 0, output: 0 },
                        searchMetrics: {
                            fastPathUsed: true,
                            avgScore: 0,
                            topScore: 0,
                            confidence: 'none',
                            queryRewritten: queryWasRewritten,
                            originalQuery: queryWasRewritten ? originalQuestion : undefined,
                        },
                    };
                }
                // Generate friendly response
                const categoryList = [...new Set(popularQuizzes.map(q => q.category))].slice(0, 3).join(', ');
                const answer = `Chào bạn! 😊 Dưới đây là **${popularQuizzes.length} quiz phổ biến** trên hệ thống:\n\n📊 **Các danh mục nổi bật:** ${categoryList}\n\n🎯 Chọn quiz bạn quan tâm để bắt đầu làm nhé!`;
                // Log analytics
                if (CONFIG.ENABLE_ANALYTICS) {
                    logAnalytics({
                        type: 'quiz_browse',
                        userId,
                        quizCount: popularQuizzes.length,
                        processingTime,
                        timestamp: Date.now(),
                    });
                }
                return {
                    answer,
                    citations: [],
                    quizRecommendations: popularQuizzes,
                    usedChunks: popularQuizzes.length,
                    processingTime,
                    tokensUsed: { input: 0, output: 0 },
                    searchMetrics: {
                        fastPathUsed: true,
                        avgScore: 1,
                        topScore: 1,
                        confidence: 'high',
                        queryRewritten: queryWasRewritten,
                        originalQuery: queryWasRewritten ? originalQuestion : undefined,
                        intent: 'quiz_browse',
                    },
                };
            }
            catch (error) {
                console.error('❌ Quiz browse failed:', error);
                // Fall through to standard search
            }
        }
        // Handle Learning Path intent
        if (intentResult.intent === 'learning_path' && intentResult.extractedTopic) {
            console.log(`📚 Learning Path mode activated for topic: "${intentResult.extractedTopic}" (depth: ${depth})`);
            try {
                const learningPathResult = await handleLearningPath(question, intentResult.extractedTopic, { depth, saveToFirestore: !!userId, userId });
                // Log performance metrics
                const processingTime = Date.now() - startTime;
                if (CONFIG.ENABLE_ANALYTICS) {
                    logAnalytics({
                        type: 'learning_path',
                        userId,
                        topic: intentResult.extractedTopic,
                        depth,
                        quizCount: learningPathResult.quizRecommendations.length,
                        processingTime,
                        timestamp: Date.now(),
                    });
                }
                return {
                    answer: learningPathResult.answer,
                    citations: [],
                    quizRecommendations: learningPathResult.quizRecommendations,
                    usedChunks: learningPathResult.quizRecommendations.length,
                    processingTime,
                    tokensUsed: {
                        input: Math.ceil(question.length / 4),
                        output: Math.ceil(learningPathResult.answer.length / 4),
                    },
                    searchMetrics: {
                        fastPathUsed: false,
                        avgScore: 0,
                        topScore: 0,
                        confidence: 'high',
                        queryRewritten: queryWasRewritten,
                        originalQuery: queryWasRewritten ? originalQuestion : undefined,
                        learningPath: {
                            enabled: true,
                            topic: intentResult.extractedTopic,
                            subTopics: getPlanKeywords(learningPathResult.plan),
                            learningOrder: getPlanKeywords(learningPathResult.plan),
                        },
                    },
                };
            }
            catch (error) {
                console.error('❌ Learning path failed, falling back to standard mode:', error);
                // Fall through to standard mode
            }
        }
        // Handle general chat (no quiz search needed)
        if (intentResult.intent === 'general_chat') {
            console.log('💬 General chat mode');
            const chatModel = getChatModel();
            const result = await chatModel.generateContent(`Bạn là AI Learning Assistant thân thiện. Trả lời ngắn gọn, vui vẻ:\n\nUser: ${question}`);
            return {
                answer: result.response.text(),
                citations: [],
                quizRecommendations: undefined,
                usedChunks: 0,
                processingTime: Date.now() - startTime,
                tokensUsed: { input: 0, output: 0 },
                searchMetrics: {
                    fastPathUsed: true,
                    avgScore: 0,
                    topScore: 0,
                    confidence: 'none',
                    queryRewritten: queryWasRewritten,
                    originalQuery: queryWasRewritten ? originalQuestion : undefined,
                },
            };
        }
    }
    // ============================================================
    // STANDARD MODE: Fact Retrieval / Quiz Search
    // ============================================================
    console.log('🔍 Standard search mode');
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
    // FIX: Tách biệt logic - nếu có quizIds từ chunks thì LUÔN fetch, bất kể search score
    // Search score (RRF) chỉ dùng để đánh giá độ tin cậy của câu trả lời, KHÔNG dùng để skip quiz
    let quizRecommendations;
    console.log(`📊 Quiz recommendation check: uniqueQuizIds=${uniqueQuizIds.length}, avgScore=${searchResult.avgScore.toFixed(4)}`);
    // CHANGED: Chỉ cần có quizIds là fetch quiz details (bỏ điều kiện avgScore)
    if (uniqueQuizIds.length > 0) {
        console.log(`📋 Fetching quiz details for IDs: ${uniqueQuizIds.join(', ')}`);
        quizRecommendations = await fetchQuizDetails(uniqueQuizIds);
        if (quizRecommendations.length === 0) {
            console.log(`⚠️ fetchQuizDetails returned empty (quizzes may not be approved)`);
            quizRecommendations = undefined;
        }
        else {
            console.log(`✅ Got ${quizRecommendations.length} quiz recommendations`);
        }
    }
    else {
        console.log(`⚠️ No quiz IDs found in search results`);
        quizRecommendations = undefined;
    }
    // Add note to answer
    let finalAnswer = answer;
    if (warning) {
        finalAnswer = `⚠️ ${warning}\n\n${answer}`;
    }
    // Chỉ hiện message "chưa có quiz" khi THỰC SỰ không tìm được quiz nào
    if (!quizRecommendations || quizRecommendations.length === 0) {
        finalAnswer += '\n\n💡 *Hiện tại chưa có quiz về chủ đề này trong hệ thống. Bạn có thể thử tìm kiếm chủ đề khác!*';
    }
    return {
        answer: finalAnswer,
        citations,
        quizRecommendations,
        usedChunks: contexts.length,
        processingTime: Date.now() - startTime,
        tokensUsed,
        searchMetrics: {
            fastPathUsed: searchResult.fastPathUsed,
            avgScore: searchResult.avgScore,
            topScore: searchResult.topScore,
            confidence,
            rewriteQueries: searchResult.rewriteQueries,
            queryRewritten: queryWasRewritten,
            originalQuery: queryWasRewritten ? originalQuestion : undefined,
            intent: intentResult === null || intentResult === void 0 ? void 0 : intentResult.intent,
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