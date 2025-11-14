import CryptoJS from 'crypto-js';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Initialize Firestore
const db = getFirestore();

// Secret key để hash OTP (trong production nên lưu trong env)
const OTP_SECRET = import.meta.env.VITE_OTP_SECRET || 'quiz-app-otp-secret-2025';
const OTP_EXPIRY_MINUTES = 10;

type OTPMetadata = Record<string, unknown> & {
  remaining?: number;
};

export interface OTPData {
  email: string;
  hashedOTP: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
}

/**
 * Generate random 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP với email để bảo mật
 */
const hashOTP = (email: string, otp: string): string => {
  return CryptoJS.SHA256(email + otp + OTP_SECRET).toString();
};

/**
 * Store OTP vào sessionStorage (không dùng Firestore để tránh lỗi permissions)
 */
export const storeOTP = (email: string, otp: string): void => {
  const otpData: OTPData = {
    email: email.toLowerCase().trim(),
    hashedOTP: hashOTP(email, otp),
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    maxAttempts: 3
  };

  // Lưu vào sessionStorage (chỉ tồn tại trong tab hiện tại)
  sessionStorage.setItem(`otp_${email.toLowerCase()}`, JSON.stringify(otpData));
  
  console.log('✅ OTP stored securely (hashed)');
};

/**
 * Gửi OTP qua Firestore Trigger Email Extension
 * Extension sẽ tự động gửi email khi có document mới trong collection 'mail'
 */
export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<{
  success: boolean;
  code: 'otp.emailQueued' | 'otp.emailQueueFailed';
  errorCode?: string;
  details?: string;
}> => {
  try {
    // Tạo HTML template cho email OTP
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0; }
          .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🧠 Quiz App</div>
            <h2 style="color: #1f2937; margin-top: 10px;">Mã Xác Thực OTP</h2>
          </div>
          
          <p style="color: #374151;">Xin chào,</p>
          <p style="color: #374151;">Bạn đã yêu cầu đăng ký tài khoản tại <strong>Quiz App</strong>.</p>
          <p style="color: #374151;">Vui lòng sử dụng mã OTP bên dưới để hoàn tất quá trình đăng ký:</p>
          
          <div class="otp-box">
            <div style="font-size: 16px; opacity: 0.9;">MÃ XÁC THỰC CỦA BẠN</div>
            <div class="otp-code">${otp}</div>
            <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">⏱️ Có hiệu lực trong 10 phút</div>
          </div>
          
          <div class="warning">
            <strong style="color: #92400e;">⚠️ Lưu ý quan trọng:</strong>
            <ul style="margin: 10px 0; color: #92400e;">
              <li>Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong></li>
              <li><strong>KHÔNG chia sẻ</strong> mã này với bất kỳ ai</li>
              <li>Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này</li>
            </ul>
          </div>
          
          <p style="color: #374151;">Trân trọng,<br><strong>Quiz App Team</strong> 🎯</p>
          
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            <p>© 2025 Quiz App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Tạo document trong collection 'mail' - Extension sẽ tự động gửi
    await addDoc(collection(db, 'mail'), {
      to: [email],
      from: 'lequytoanptit0303@gmail.com', // Default FROM address từ extension config
      replyTo: 'lequytoanptit0303@gmail.com',
      message: {
        subject: '🔐 Mã xác thực đăng ký Quiz App',
        html: emailHTML,
        text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 10 phút.`
      },
      createdAt: new Date()
    });

    console.log('✅ Email queued successfully via Firestore extension');

    return {
      success: true,
      code: 'otp.emailQueued'
    };
  } catch (error: any) {
    console.error('Error queuing email:', error);
    return {
      success: false,
      code: 'otp.emailQueueFailed',
      errorCode: error?.code,
      details: error?.message
    };
  }
};

/**
 * Generate và gửi OTP
 */
export const generateAndSendOTP = async (
  email: string
): Promise<{
  success: boolean;
  code: 'otp.sent' | 'otp.emailFailed' | 'otp.genericError';
  metadata?: OTPMetadata;
}> => {
  try {
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP locally (hashed)
    storeOTP(email, otp);
    
    // Send OTP via Cloud Function
    const result = await sendOTPEmail(email, otp);
    
    if (result.success) {
      return {
        success: true,
        code: 'otp.sent',
        metadata: { email }
      };
    }

    // Clear stored OTP nếu gửi thất bại
    clearOTP(email);
    return {
      success: false,
      code: 'otp.emailFailed',
      metadata: {
        email,
        errorCode: result.errorCode,
        details: result.details
      }
    };
  } catch (error: any) {
    console.error('Error generating and sending OTP:', error);
    return {
      success: false,
      code: 'otp.genericError',
      metadata: {
        email,
        details: error?.message
      }
    };
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = (
  email: string,
  inputOTP: string
): {
  success: boolean;
  code: 'otp.verifySuccess' | 'otp.notFound' | 'otp.expired' | 'otp.maxAttempts' | 'otp.incorrect' | 'otp.genericError';
  metadata?: OTPMetadata;
} => {
  const storageKey = `otp_${email.toLowerCase()}`;
  const storedData = sessionStorage.getItem(storageKey);

  if (!storedData) {
    return { success: false, code: 'otp.notFound' };
  }

  try {
    const otpData: OTPData = JSON.parse(storedData);

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      sessionStorage.removeItem(storageKey);
      return { success: false, code: 'otp.expired' };
    }

    // Check max attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      sessionStorage.removeItem(storageKey);
      return { success: false, code: 'otp.maxAttempts' };
    }

    // Verify OTP
    const inputHash = hashOTP(email, inputOTP);
    if (inputHash === otpData.hashedOTP) {
      // Success - xóa OTP
      sessionStorage.removeItem(storageKey);
      return { success: true, code: 'otp.verifySuccess' };
    } else {
      // Failed - tăng attempts
      otpData.attempts += 1;
      sessionStorage.setItem(storageKey, JSON.stringify(otpData));
      
      const remaining = otpData.maxAttempts - otpData.attempts;
      return { 
        success: false, 
        code: 'otp.incorrect',
        metadata: { remaining }
      };
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, code: 'otp.genericError' };
  }
};

/**
 * Clear OTP data
 */
export const clearOTP = (email: string): void => {
  sessionStorage.removeItem(`otp_${email.toLowerCase()}`);
};

/**
 * Get OTP expiry time
 */
export const getOTPExpiryTime = (email: string): number | null => {
  const storageKey = `otp_${email.toLowerCase()}`;
  const storedData = sessionStorage.getItem(storageKey);

  if (!storedData) return null;

  try {
    const otpData: OTPData = JSON.parse(storedData);
    return otpData.expiresAt;
  } catch {
    return null;
  }
};
