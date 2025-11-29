"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualCleanupRooms = exports.onPlayerStatusChange = exports.cleanupAbandonedRooms = exports.kickPlayer = exports.archiveCompletedRooms = exports.checkRateLimit = exports.getPlayerQuestions = exports.validateAnswer = exports.getPendingTagReviews = exports.reviewTags = exports.batchGenerateTags = exports.regenerateTags = exports.autoTagOnApproval = exports.getIndexStats = exports.rebuildFullIndex = exports.askRAGHealth = exports.askRAG = exports.analyzeQuizResult = exports.processFile = exports.sendOTP = exports.generateQuestionsHTTP = exports.testAI = exports.generateQuestions = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
const cors = require("cors");
const nodemailer = require("nodemailer");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize CORS
const corsHandler = cors({ origin: true });
// ✅ Secure: API key from environment variable (set via Firebase Secrets)
// Updated: 2025-11-25 - Fixed secret configuration
const aiModel = 'gemini-2.5-flash-lite';
// Lazy initialization to ensure secrets are loaded
function getGenAI() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
// Configure email transporter (sử dụng Gmail SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
// OTP Email Template
const getOTPEmailHTML = (otp) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #2563eb; }
        .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0; }
        .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🧠 Quiz App</div>
          <h2>Mã Xác Thực OTP</h2>
        </div>
        
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu đăng ký tài khoản tại <strong>Quiz App</strong>.</p>
        <p>Vui lòng sử dụng mã OTP bên dưới để hoàn tất quá trình đăng ký:</p>
        
        <div class="otp-box">
          <div>MÃ XÁC THỰC CỦA BẠN</div>
          <div class="otp-code">${otp}</div>
          <div style="font-size: 14px; margin-top: 10px;">Có hiệu lực trong 10 phút</div>
        </div>
        
        <div class="warning">
          <strong>⚠️ Lưu ý quan trọng:</strong>
          <ul style="margin: 10px 0;">
            <li>Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong></li>
            <li><strong>KHÔNG chia sẻ</strong> mã này với bất kỳ ai</li>
            <li>Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này</li>
          </ul>
        </div>
        
        <p>Trân trọng,<br><strong>Quiz App Team</strong></p>
        
        <div class="footer">
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          <p>© 2025 Quiz App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
/**
 * Firebase Function để generate câu hỏi sử dụng Vertex AI/Gemini
 */
exports.generateQuestions = functions
    .runWith({ secrets: ['GOOGLE_AI_API_KEY'] })
    .https.onCall(async (data, context) => {
    // Kiểm tra authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Phải đăng nhập để sử dụng tính năng này');
    }
    const { prompt, content, config } = data;
    if (!prompt || !content) {
        throw new functions.https.HttpsError('invalid-argument', 'Thiếu prompt hoặc content');
    }
    try {
        // Tạo request cho Google Generative AI
        const model = getGenAI().getGenerativeModel({
            model: (config === null || config === void 0 ? void 0 : config.model) || aiModel,
            generationConfig: {
                temperature: (config === null || config === void 0 ? void 0 : config.temperature) || 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: (config === null || config === void 0 ? void 0 : config.maxTokens) || 32000, // ⚡ gemini-2.5-flash-lite: increased for long PDF/image + full Q&A with explanations
            },
        });
        const promptText = `${prompt}\n\nNội dung để tạo câu hỏi:\n\n${content}`;
        const response = await model.generateContent(promptText);
        const result = response.response;
        if (!result || !result.text()) {
            throw new Error('Không nhận được phản hồi từ AI');
        }
        const generatedText = result.text();
        console.log('📥 Raw AI response (first 500 chars):', generatedText === null || generatedText === void 0 ? void 0 : generatedText.substring(0, 500));
        // Parse JSON từ response
        let parsedQuestions;
        try {
            if (!generatedText) {
                throw new Error('AI không trả về text response');
            }
            // Clean markdown code blocks and whitespace
            let cleanText = generatedText
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();
            console.log('🧹 Cleaned text (first 500 chars):', cleanText.substring(0, 500));
            const parsed = JSON.parse(cleanText);
            // Support both array format and {questions: []} format
            if (Array.isArray(parsed)) {
                parsedQuestions = parsed;
            }
            else if (parsed.questions && Array.isArray(parsed.questions)) {
                parsedQuestions = parsed.questions;
            }
            else {
                parsedQuestions = [];
            }
            console.log(`✅ Successfully parsed ${parsedQuestions.length} questions`);
            if (!Array.isArray(parsedQuestions)) {
                console.error('❌ parsed.questions is not an array:', typeof parsedQuestions);
                throw new Error('questions field is not an array');
            }
            if (parsedQuestions.length === 0) {
                console.error('❌ No questions in parsed response');
                throw new Error('AI returned 0 questions');
            }
        }
        catch (parseError) {
            console.error('❌ Error parsing JSON:', parseError);
            console.error('Raw response:', generatedText);
            // Return detailed error for debugging
            throw new Error(`Không thể phân tích câu hỏi từ AI. ` +
                `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}. ` +
                `Response preview: ${(generatedText === null || generatedText === void 0 ? void 0 : generatedText.substring(0, 200)) || 'empty'}`);
        }
        // Log cho debugging
        console.log(`Generated ${parsedQuestions.length} questions for user ${context.auth.uid}`);
        return {
            success: true,
            questions: parsedQuestions,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
    }
    catch (error) {
        console.error('Error generating questions:', error);
        throw new functions.https.HttpsError('internal', `Lỗi khi tạo câu hỏi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Test function để kiểm tra AI availability
 */
exports.testAI = functions
    .runWith({ secrets: ['GOOGLE_AI_API_KEY'] })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    try {
        const model = getGenAI().getGenerativeModel({ model: aiModel });
        const response = await model.generateContent('Hello, this is a test. Please respond with "AI is working"');
        const result = response.response;
        return {
            success: true,
            message: 'Google Generative AI is available',
            response: result.text() || 'No response'
        };
    }
    catch (error) {
        console.error('Test AI error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
/**
 * HTTP function để handle CORS cho development
 */
exports.generateQuestionsHTTP = functions
    .runWith({ secrets: ['GOOGLE_AI_API_KEY'] })
    .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a;
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Verify Firebase Auth token
            const idToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
            if (!idToken) {
                res.status(401).send('Unauthorized');
                return;
            }
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const { prompt, content, config } = req.body;
            if (!prompt || !content) {
                res.status(400).send('Missing prompt or content');
                return;
            }
            const model = getGenAI().getGenerativeModel({
                model: (config === null || config === void 0 ? void 0 : config.model) || aiModel,
                generationConfig: {
                    temperature: (config === null || config === void 0 ? void 0 : config.temperature) || 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: (config === null || config === void 0 ? void 0 : config.maxTokens) || 32000, // ⚡ gemini-2.5-flash-lite: increased for long content
                },
            });
            const promptText = `${prompt}\n\nNội dung để tạo câu hỏi:\n\n${content}`;
            const response = await model.generateContent(promptText);
            const result = response.response;
            const generatedText = result.text();
            if (!generatedText) {
                throw new Error('No response from AI');
            }
            // Parse JSON
            const cleanText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanText);
            const questions = parsed.questions || [];
            console.log(`Generated ${questions.length} questions for user ${decodedToken.uid}`);
            res.json({
                success: true,
                questions: questions,
                generatedAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('HTTP function error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
});
/**
 * Cloud Function để gửi OTP qua email
 * Callable function - Không cần auth vì đây là bước trước khi đăng ký
 */
exports.sendOTP = functions.https.onCall(async (data, context) => {
    const { email, otp } = data;
    // Validate input
    if (!email || !otp) {
        throw new functions.https.HttpsError('invalid-argument', 'Email và OTP là bắt buộc');
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new functions.https.HttpsError('invalid-argument', 'Email không hợp lệ');
    }
    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
        throw new functions.https.HttpsError('invalid-argument', 'OTP phải là 6 chữ số');
    }
    try {
        console.log(`📧 Sending OTP to ${email}`);
        // Send email
        await transporter.sendMail({
            from: `"Quiz App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Mã xác thực đăng ký Quiz App',
            html: getOTPEmailHTML(otp)
        });
        console.log(`✅ OTP sent successfully to ${email}`);
        // Log to Firestore for tracking (optional)
        await admin.firestore().collection('otp_logs').add({
            email: email.toLowerCase(),
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'sent'
        });
        return {
            success: true,
            message: 'OTP đã được gửi đến email của bạn'
        };
    }
    catch (error) {
        console.error('Error sending OTP:', error);
        // Log error
        await admin.firestore().collection('otp_logs').add({
            email: email.toLowerCase(),
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new functions.https.HttpsError('internal', 'Không thể gửi email. Vui lòng thử lại sau.');
    }
});
// ============================================================
// 📁 File Processing Function (OCR, PDF, Documents)
// ============================================================
exports.processFile = functions
    .region('us-central1')
    .runWith({ timeoutSeconds: 120, memory: '256MB', secrets: ['GOOGLE_AI_API_KEY'] })
    .https.onCall(async (data, context) => {
    // Validate auth
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Bạn cần đăng nhập để sử dụng tính năng này');
    }
    const { base64Data, mimeType, fileType } = data;
    if (!base64Data || !mimeType) {
        throw new functions.https.HttpsError('invalid-argument', 'Thiếu dữ liệu file hoặc loại file');
    }
    try {
        const model = getGenAI().getGenerativeModel({ model: aiModel });
        let prompt = '';
        switch (fileType) {
            case 'image':
                prompt = `
Phân tích hình ảnh này và trích xuất nội dung văn bản. 
Nếu có biểu đồ, bảng, hoặc thông tin trực quan, hãy mô tả chi tiết.
Trả về nội dung một cách có cấu trúc và rõ ràng để có thể tạo câu hỏi.
`;
                break;
            case 'pdf':
                prompt = `
Đây là file PDF. Hãy trích xuất và phân tích nội dung văn bản từ file này.
Tóm tắt nội dung chính và cung cấp thông tin chi tiết để có thể tạo câu hỏi.
Nếu có bảng, biểu đồ hoặc hình ảnh, hãy mô tả chúng.
`;
                break;
            case 'document':
                prompt = `
Đây là file tài liệu Word. Hãy trích xuất và phân tích nội dung văn bản từ file này.
Tóm tắt nội dung chính và cung cấp thông tin chi tiết để có thể tạo câu hỏi.
Bao gồm cả định dạng, tiêu đề, và cấu trúc của tài liệu.
`;
                break;
            default:
                throw new functions.https.HttpsError('invalid-argument', `Loại file không được hỗ trợ: ${fileType}`);
        }
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]);
        const response = result.response;
        const content = response.text();
        return {
            success: true,
            content,
            type: fileType
        };
    }
    catch (error) {
        console.error('❌ File processing error:', error);
        throw new functions.https.HttpsError('internal', `Lỗi xử lý file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// ============================================================
// 📊 Quiz Analysis Function (AI-powered feedback)
// ============================================================
exports.analyzeQuizResult = functions
    .region('us-central1')
    .runWith({ timeoutSeconds: 60, memory: '256MB', secrets: ['GOOGLE_AI_API_KEY'] })
    .https.onCall(async (data, context) => {
    // Validate auth
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Bạn cần đăng nhập để sử dụng tính năng này');
    }
    const { quizTitle, category, difficulty, totalQuestions, correctAnswers, percentage, timeSpent, incorrectDetails } = data;
    if (typeof percentage !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'Thiếu thông tin kết quả quiz');
    }
    try {
        const model = getGenAI().getGenerativeModel({ model: aiModel });
        // Build detailed wrong answers section
        const wrongAnswersSection = (incorrectDetails || []).length > 0
            ? `**CHI TIẾT CÁC CÂU SAI:**
${(incorrectDetails || []).map((d) => `
📌 Câu ${d.number}: ${d.questionText || 'Không có nội dung'}
   - Bạn chọn: "${d.userAnswer || 'Không rõ'}"
   - Đáp án đúng: "${d.correctAnswer || 'Không rõ'}"
   - Loại câu hỏi: ${d.type || 'multiple-choice'}
   - Độ khó: ${d.difficulty || 'medium'}
`).join('\n')}`
            : '**CHI TIẾT CÁC CÂU SAI:** Không có câu sai nào!';
        const prompt = `Bạn là một chuyên gia giáo dục AI. Phân tích kết quả quiz và đưa ra nhận xét CHI TIẾT, CỤ THỂ dựa trên các câu sai thực tế của người chơi.

**THÔNG TIN QUIZ:**
- Tiêu đề: ${quizTitle || 'Quiz'}
- Chủ đề: ${category || 'Tổng hợp'}
- Độ khó: ${difficulty || 'medium'}
- Tổng số câu: ${totalQuestions}

**KẾT QUẢ:**
- Điểm: ${percentage}% (${correctAnswers}/${totalQuestions} câu đúng)
- Thời gian: ${Math.floor((timeSpent || 0) / 60)} phút ${(timeSpent || 0) % 60} giây
- Số câu sai: ${(incorrectDetails || []).length} câu

${wrongAnswersSection}

**YÊU CẦU PHÂN TÍCH (RẤT QUAN TRỌNG):**
1. Đánh giá CHÍNH XÁC dựa trên điểm số thực tế (${percentage}%)
2. Nếu có câu sai, PHẢI đề cập CỤ THỂ đến các lỗi sai trong phần weaknesses
3. Trong phần study_tips, PHẢI đưa ra gợi ý CỤ THỂ để hiểu đúng các câu đã sai
4. KHÔNG được khen quá mức nếu điểm dưới 70%
5. Nếu có nhiều câu sai, cần nghiêm túc chỉ ra vấn đề

Trả về JSON với các trường sau:
- performance_level: "excellent" (>=90%), "good" (70-89%), "average" (50-69%), "needs-improvement" (<50%)
- overall_feedback: Nhận xét tổng quan CHÍNH XÁC với điểm số (2-3 câu)
- strengths: Mảng 2-3 điểm mạnh THỰC TẾ
- weaknesses: Mảng 2-4 điểm yếu CỤ THỂ dựa trên các câu sai (ví dụ: "Chưa nắm rõ khái niệm X trong câu Y")
- study_tips: Mảng 3-5 lời khuyên CỤ THỂ để khắc phục các lỗi sai
- focus_areas: Mảng 2-3 chủ đề CẦN TẬP TRUNG ôn lại
- next_steps: Mảng 3-4 bước tiếp theo

**ĐỊNH DẠNG JSON:**
\`\`\`json
{
  "performance_level": "...",
  "overall_feedback": "...",
  "strengths": ["...", "..."],
  "weaknesses": ["Câu X: Bạn nhầm lẫn giữa A và B", "..."],
  "study_tips": ["Để hiểu câu X, bạn cần...", "..."],
  "focus_areas": ["...", "..."],
  "next_steps": ["...", "...", "..."]
}
\`\`\`

Chỉ trả lời JSON, không giải thích thêm.`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Parse JSON from response
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Không thể parse kết quả AI');
        }
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonText);
        return {
            success: true,
            analysis: {
                performanceLevel: parsed.performance_level,
                overallFeedback: parsed.overall_feedback,
                strengths: parsed.strengths || [],
                weaknesses: parsed.weaknesses || [],
                studyTips: parsed.study_tips || [],
                focusAreas: parsed.focus_areas || [],
                nextSteps: parsed.next_steps || [],
                generatedAt: new Date().toISOString(),
                confidence: 0.85
            }
        };
    }
    catch (error) {
        console.error('❌ Quiz analysis error:', error);
        // Return fallback analysis
        const level = percentage >= 90 ? 'excellent' : percentage >= 70 ? 'good' : percentage >= 50 ? 'average' : 'needs-improvement';
        const feedbackMap = {
            excellent: 'Xuất sắc! Bạn đã thể hiện sự hiểu biết sâu sắc về chủ đề này.',
            good: 'Tốt lắm! Bạn đã nắm vững phần lớn kiến thức.',
            average: 'Khá ổn! Còn một số điểm cần cải thiện thêm.',
            'needs-improvement': 'Đừng nản lòng! Hãy xem lại và thử lại nhé.'
        };
        return {
            success: true,
            analysis: {
                performanceLevel: level,
                overallFeedback: feedbackMap[level],
                strengths: ['Hoàn thành quiz', 'Kiên trì làm bài'],
                weaknesses: percentage < 70 ? ['Cần ôn tập thêm kiến thức cơ bản'] : [],
                studyTips: [
                    'Xem lại các câu sai và hiểu tại sao',
                    'Làm thêm các quiz tương tự để rèn luyện',
                    'Ghi chú lại những điểm quan trọng'
                ],
                focusAreas: percentage < 70 ? ['Kiến thức cơ bản', 'Kỹ năng làm bài'] : [],
                nextSteps: [
                    'Xem lại đáp án chi tiết',
                    'Làm lại quiz để củng cố',
                    'Thử các quiz khác cùng chủ đề'
                ],
                generatedAt: new Date().toISOString(),
                confidence: 0.5
            },
            fallback: true
        };
    }
});
// ============================================================
// 🤖 RAG (Retrieval-Augmented Generation) Functions
// ============================================================
var ask_1 = require("./rag/ask");
Object.defineProperty(exports, "askRAG", { enumerable: true, get: function () { return ask_1.askRAG; } });
Object.defineProperty(exports, "askRAGHealth", { enumerable: true, get: function () { return ask_1.askRAGHealth; } });
var rebuildIndex_1 = require("./rag/rebuildIndex");
Object.defineProperty(exports, "rebuildFullIndex", { enumerable: true, get: function () { return rebuildIndex_1.rebuildFullIndex; } });
Object.defineProperty(exports, "getIndexStats", { enumerable: true, get: function () { return rebuildIndex_1.getIndexStats; } });
// ============================================================
// 🏷️ Auto-Tagging Pipeline (GĐ4 - Master Plan v4.1)
// Handles: Auto-tag on approval + Remove from index on delete/unapprove
// NEW v4.1: Tag quality control with admin review
// ============================================================
var autoTagging_1 = require("./rag/autoTagging");
Object.defineProperty(exports, "autoTagOnApproval", { enumerable: true, get: function () { return autoTagging_1.autoTagOnApproval; } });
Object.defineProperty(exports, "regenerateTags", { enumerable: true, get: function () { return autoTagging_1.regenerateTags; } });
Object.defineProperty(exports, "batchGenerateTags", { enumerable: true, get: function () { return autoTagging_1.batchGenerateTags; } });
Object.defineProperty(exports, "reviewTags", { enumerable: true, get: function () { return autoTagging_1.reviewTags; } });
Object.defineProperty(exports, "getPendingTagReviews", { enumerable: true, get: function () { return autoTagging_1.getPendingTagReviews; } });
// NOTE: onQuizApproved, onQuizCreatedApproved, onQuizDeleted triggers
// have been MERGED into autoTagOnApproval (single onWrite trigger)
// to avoid race conditions and duplicate processing
// ============================================================
// 🎮 Multiplayer Functions (Security & Anti-Cheat)
// ============================================================
var index_1 = require("./multiplayer/index");
Object.defineProperty(exports, "validateAnswer", { enumerable: true, get: function () { return index_1.validateAnswer; } });
Object.defineProperty(exports, "getPlayerQuestions", { enumerable: true, get: function () { return index_1.getPlayerQuestions; } });
Object.defineProperty(exports, "checkRateLimit", { enumerable: true, get: function () { return index_1.checkRateLimit; } });
Object.defineProperty(exports, "archiveCompletedRooms", { enumerable: true, get: function () { return index_1.archiveCompletedRooms; } });
Object.defineProperty(exports, "kickPlayer", { enumerable: true, get: function () { return index_1.kickPlayer; } });
// Auto-cleanup functions (30 min inactivity)
Object.defineProperty(exports, "cleanupAbandonedRooms", { enumerable: true, get: function () { return index_1.cleanupAbandonedRooms; } });
Object.defineProperty(exports, "onPlayerStatusChange", { enumerable: true, get: function () { return index_1.onPlayerStatusChange; } });
Object.defineProperty(exports, "manualCleanupRooms", { enumerable: true, get: function () { return index_1.manualCleanupRooms; } });
//# sourceMappingURL=index.js.map