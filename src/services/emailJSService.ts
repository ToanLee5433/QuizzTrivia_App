import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_z0wmuk1', // Sẽ được tạo trong EmailJS dashboard
  TEMPLATE_ID: 'template_4eh8284', // Sẽ được tạo trong EmailJS dashboard
  PUBLIC_KEY: 'EsTsdBR5D5grAFCfF' // Sẽ được lấy từ EmailJS dashboard
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

  async sendOTPEmail(email: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const templateParams = {
        to_email: email,
        otp_code: otpCode,
        app_name: 'Quiz Trivia App',
        from_name: 'Quiz Trivia Team',
        message: `Mã xác thực của bạn là: ${otpCode}. Mã này có hiệu lực trong 10 phút.`
      };

      console.log('🚀 Sending OTP email via EmailJS to:', email);
      
      const response = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );

      if (response.status === 200) {
        console.log('✅ Email sent successfully:', response);
        return {
          success: true,
          message: `Mã xác thực đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư.`
        };
      } else {
        throw new Error(`EmailJS error: ${response.text}`);
      }
    } catch (error: any) {
      console.error('❌ EmailJS send error:', error);
      return {
        success: false,
        message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.'
      };
    }
  }
}

export const emailJSService = EmailJSService.getInstance();
