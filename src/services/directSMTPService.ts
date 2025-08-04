// Direct SMTP Email Service - không cần Firebase Functions
// Sử dụng local SMTP server hoặc fallback test mode

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
}

// Service gửi email qua SMTP trực tiếp từ frontend
export class DirectSMTPService {
  private static instance: DirectSMTPService;

  private constructor() {
    // Config stored in smtp-server.js
  }

  static getInstance(): DirectSMTPService {
    if (!DirectSMTPService.instance) {
      DirectSMTPService.instance = new DirectSMTPService();
    }
    return DirectSMTPService.instance;
  }

  // Gửi email OTP trực tiếp qua SMTP
  async sendOTPEmail(toEmail: string, otpCode: string): Promise<boolean> {
    try {
      console.log(`📧 Sending OTP ${otpCode} to ${toEmail} via SMTP...`);

      // Gửi qua local SMTP server
      const result = await this.sendViaLocalServer(toEmail, otpCode);
      
      if (result) {
        console.log(`✅ Email sent successfully to ${toEmail}`);
        return true;
      } else {
        console.error(`❌ Failed to send email to ${toEmail}`);
        throw new Error('SMTP server không khả dụng. Vui lòng chạy start-smtp.bat trước khi đăng ký.');
      }
    } catch (error) {
      console.error('SMTP Error:', error);
      throw error;
    }
  }

  // Gửi qua local SMTP server (bắt buộc)
  private async sendViaLocalServer(toEmail: string, otpCode: string): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3001/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toEmail,
          code: otpCode
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SMTP Server response:', result);
        return result.success;
      } else {
        const errorText = await response.text();
        console.error('❌ SMTP Server error:', errorText);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Cannot connect to SMTP server:', error.message);
      return false;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing SMTP connection...');
      // Implement connection test
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const smtpService = DirectSMTPService.getInstance();
