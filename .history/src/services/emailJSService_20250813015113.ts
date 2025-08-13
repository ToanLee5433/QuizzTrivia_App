import emailjs from '@emailjs/browser';

// EmailJS Configuration - ĐÃ CẬP NHẬT VỚI THÔNG TIN THỰC TẾ
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z0wmuk1', 
  TEMPLATE_ID: 'template_quiz_otp', 
  PUBLIC_KEY: 'EsTsdBR5D5grAFCfF'
};

export class EmailJSService {
  private static instance: EmailJSService;

  private constructor() {
    // Initialize EmailJS with public key
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
  }

  static getInstance(): EmailJSService {
    if (!EmailJSService.instance) {
      EmailJSService.instance = new EmailJSService();
    }
    return EmailJSService.instance;
  }

  async sendOTPEmail(email: string, otpCode: string): Promise<{ success: boolean; messageKey: string; params?: any }> {
    try {
      // Kiểm tra email đầu vào
      if (!email || email.trim() === '') {
        throw new Error('email.required');
      }

      console.log('🔧 EmailJS Config đã sẵn sàng:', {
        SERVICE_ID: EMAILJS_CONFIG.SERVICE_ID,
        TEMPLATE_ID: EMAILJS_CONFIG.TEMPLATE_ID,
        PUBLIC_KEY: EMAILJS_CONFIG.PUBLIC_KEY.substring(0, 5) + '...'
      });

      const templateParams = {
        // QUAN TRỌNG: EmailJS cần field này để biết gửi đến đâu
        to_email: email.trim(),
        to_name: email.split('@')[0],
        user_email: email.trim(), // Backup field
        
        // OTP data
        otp_code: otpCode,
        
        // App info
        app_name: 'Quiz Trivia App',
        from_name: 'Quiz Trivia Team',
        message: `Mã xác thực của bạn là: ${otpCode}. Mã này có hiệu lực trong 10 phút.`,
        
        // Email settings
        reply_to: 'noreply@quiztrivia.com'
      };

      console.log('🚀 Đang gửi OTP email đến:', email);
      console.log('📧 Template params đầy đủ:', templateParams);
      
      const response = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      console.log('✅ EmailJS Response thành công:', response);

      if (response.status === 200) {
        return {
          success: true,
          messageKey: 'email.otpSent',
          params: { email }
        };
      } else {
        throw new Error(`EmailJS error: ${response.text}`);
      }
    } catch (error: any) {
      console.error('❌ EmailJS gặp lỗi:', error);
      console.error('❌ Chi tiết lỗi:', {
        name: error.name,
        message: error.message,
        text: error.text,
        status: error.status
      });
      
      // Xử lý lỗi cụ thể
      if (error.text) {
        if (error.text.includes('recipients address is empty')) {
          return {
            success: false,
            messageKey: 'email.errors.configurationError'
          };
        }
        if (error.text.includes('template') || error.text.includes('Template')) {
          return {
            success: false,
            messageKey: 'email.errors.templateError',
            params: { templateId: EMAILJS_CONFIG.TEMPLATE_ID }
          };
        }
        if (error.text.includes('service') || error.text.includes('Service')) {
          return {
            success: false,
            messageKey: 'email.errors.serviceError',
            params: { serviceId: EMAILJS_CONFIG.SERVICE_ID }
          };
        }
        if (error.text.includes('public key') || error.text.includes('Public Key')) {
          return {
            success: false,
            messageKey: 'email.errors.keyError'
          };
        }
      }
      
      // Lỗi khác
      return {
        success: false,
        messageKey: 'email.errors.sendFailed',
        params: { error: error.text || error.message || 'Unknown error' }
      };
    }
  }
}

export const emailJSService = EmailJSService.getInstance();
