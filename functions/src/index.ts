import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { VertexAI } from '@google-cloud/vertexai';
import * as cors from 'cors';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize CORS
const corsHandler = cors({ origin: true });

// Initialize Vertex AI
const vertex_ai = new VertexAI({
  project: 'datn-quizapp',
  location: 'us-central1'
});

const model = 'gemini-pro';

// Configure email transporter (sử dụng Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || process.env.EMAIL_USER,
    pass: functions.config().email?.password || process.env.EMAIL_PASSWORD
  }
});

// OTP Email Template
const getOTPEmailHTML = (otp: string): string => {
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
export const generateQuestions = functions.https.onCall(async (data, context) => {
  // Kiểm tra authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Phải đăng nhập để sử dụng tính năng này'
    );
  }

  const { prompt, content, config } = data;

  if (!prompt || !content) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Thiếu prompt hoặc content'
    );
  }

  try {
    // Tạo request cho Vertex AI
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: config?.model || model,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: config?.maxTokens || 2000,
      },
    });

    const request = {
      contents: [{
        role: 'user',
        parts: [{
          text: `${prompt}\n\nNội dung để tạo câu hỏi:\n\n${content}`
        }]
      }]
    };

    const response = await generativeModel.generateContent(request);
    
    if (!response.response || !response.response.candidates || response.response.candidates.length === 0) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    const generatedText = response.response.candidates[0].content.parts[0].text;
    
    // Parse JSON từ response
    let parsedQuestions;
    try {
      if (!generatedText) {
        throw new Error('AI không trả về text response');
      }
      const cleanText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);
      parsedQuestions = parsed.questions || [];
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      throw new Error('Không thể phân tích câu hỏi từ AI');
    }

    // Log cho debugging
    console.log(`Generated ${parsedQuestions.length} questions for user ${context.auth.uid}`);

    return {
      success: true,
      questions: parsedQuestions,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Error generating questions:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Lỗi khi tạo câu hỏi: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Test function để kiểm tra AI availability
 */
export const testAI = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required'
    );
  }

  try {
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: model,
    });

    const request = {
      contents: [{
        role: 'user',
        parts: [{
          text: 'Hello, this is a test. Please respond with "AI is working"'
        }]
      }]
    };

    const response = await generativeModel.generateContent(request);
    
    return {
      success: true,
      message: 'Firebase AI is available',
      response: response.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
    };

  } catch (error) {
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
export const generateQuestionsHTTP = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Verify Firebase Auth token
      const idToken = req.headers.authorization?.replace('Bearer ', '');
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

      const generativeModel = vertex_ai.preview.getGenerativeModel({
        model: config?.model || model,
        generationConfig: {
          temperature: config?.temperature || 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: config?.maxTokens || 2000,
        },
      });

      const request = {
        contents: [{
          role: 'user',
          parts: [{
            text: `${prompt}\n\nNội dung để tạo câu hỏi:\n\n${content}`
          }]
        }]
      };

      const response = await generativeModel.generateContent(request);
      const generatedText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;

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

    } catch (error) {
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
export const sendOTP = functions.https.onCall(async (data, context) => {
  const { email, otp } = data;

  // Validate input
  if (!email || !otp) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email và OTP là bắt buộc'
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email không hợp lệ'
    );
  }

  // Validate OTP format (6 digits)
  if (!/^\d{6}$/.test(otp)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'OTP phải là 6 chữ số'
    );
  }

  try {
    console.log(`📧 Sending OTP to ${email}`);

    // Send email
    await transporter.sendMail({
      from: `"Quiz App" <${functions.config().email?.user || process.env.EMAIL_USER}>`,
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

  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Log error
    await admin.firestore().collection('otp_logs').add({
      email: email.toLowerCase(),
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new functions.https.HttpsError(
      'internal',
      'Không thể gửi email. Vui lòng thử lại sau.'
    );
  }
});
