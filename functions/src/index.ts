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
  project: 'quiz-app-85db6',
  location: 'us-central1'
});

const model = 'gemini-pro';

// Cấu hình SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Template email OTP
const getOTPEmailTemplate = (code: string, expiresIn: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Mã xác thực Quiz App</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .otp-code { background: #f8fafc; border: 2px dashed #2563eb; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🧠 Quiz App</div>
          <h2>Xác thực email đăng ký</h2>
        </div>
        
        <p>Xin chào!</p>
        <p>Bạn đã yêu cầu đăng ký tài khoản tại Quiz App. Vui lòng sử dụng mã xác thực bên dưới để hoàn tất quá trình đăng ký:</p>
        
        <div class="otp-code">
          <div class="code">${code}</div>
          <p style="margin: 10px 0 0 0; color: #6b7280;">Mã này có hiệu lực trong ${expiresIn}</p>
        </div>
        
        <p><strong>Lưu ý quan trọng:</strong></p>
        <ul>
          <li>Mã xác thực này chỉ có hiệu lực trong ${expiresIn}</li>
          <li>Không chia sẻ mã này với bất kỳ ai khác</li>
          <li>Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này</li>
        </ul>
        
        <p>Cảm ơn bạn đã tham gia Quiz App!</p>
        
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

// Cloud Function để xử lý queue email OTP
export const processEmailQueue = functions.firestore
  .document('email_queue/{docId}')
  .onCreate(async (snap, context) => {
    const emailData = snap.data();
    
    try {
      let htmlContent = '';
      
      // Tạo nội dung email dựa trên template
      switch (emailData.template) {
        case 'otp_verification':
          htmlContent = getOTPEmailTemplate(
            emailData.data.code,
            emailData.data.expiresIn || '10 phút'
          );
          break;
        default:
          throw new Error('Unknown email template');
      }

      // Gửi email
      await transporter.sendMail({
        from: `"Quiz App" <${process.env.EMAIL_USER}>`,
        to: emailData.to,
        subject: emailData.subject || 'Mã xác thực đăng ký Quiz App',
        html: htmlContent
      });

      // Cập nhật status thành công
      await snap.ref.update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Email sent successfully to ${emailData.to}`);

    } catch (error) {
      console.error('Error sending email:', error);
      
      // Cập nhật status thất bại
      await snap.ref.update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Cloud Function để cleanup email queue cũ (chạy hàng ngày)
export const cleanupEmailQueue = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async (context) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7); // Xóa email cũ hơn 7 ngày

    const query = admin.firestore()
      .collection('email_queue')
      .where('createdAt', '<', cutoff);

    const snapshot = await query.get();
    
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} old email queue entries`);
    
    return null;
  });
