const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin nếu chưa có
if (!admin.apps.length) {
  admin.initializeApp();
}

// Cấu hình SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.password || 'your-app-password'
  }
});

// Template email OTP
const getOTPEmailTemplate = (code, expiresIn) => {
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

// Cloud Function để test gửi email
exports.sendTestEmail = functions.https.onCall(async (data, context) => {
  try {
    const { to, template, data: emailData } = data;
    
    if (!to) {
      throw new functions.https.HttpsError('invalid-argument', 'Email to is required');
    }

    let htmlContent = '';
    let subject = '';
    
    switch (template) {
      case 'otp_verification':
        htmlContent = getOTPEmailTemplate(emailData.code, emailData.expiresIn);
        subject = 'Mã xác thực đăng ký Quiz App';
        break;
      case 'test':
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🧪 Test Email từ Quiz App</h2>
            <p>Đây là email test từ Firebase Functions.</p>
            <p><strong>Mã OTP:</strong> ${emailData.code}</p>
            <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
            <p>Nếu bạn nhận được email này, có nghĩa là SMTP đã hoạt động tốt! 🎉</p>
          </div>
        `;
        subject = '🧪 Test Email - Quiz App';
        break;
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid template');
    }

    // Gửi email
    const info = await transporter.sendMail({
      from: `"Quiz App Test" <${functions.config().email?.user}>`,
      to: to,
      subject: subject,
      html: htmlContent
    });

    console.log('Email sent successfully:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      to: to,
      template: template,
      sentAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Cloud Function để xử lý email queue từ Firestore
exports.processEmailQueue = functions.firestore
  .document('email_queue/{docId}')
  .onCreate(async (snap, context) => {
    const emailData = snap.data();
    
    try {
      let htmlContent = '';
      let subject = '';
      
      switch (emailData.template) {
        case 'otp_verification':
          htmlContent = getOTPEmailTemplate(
            emailData.data.code,
            emailData.data.expiresIn
          );
          subject = 'Mã xác thực đăng ký Quiz App';
          break;
        case 'test':
          htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>🧪 Test Email từ Quiz App</h2>
              <p>Đây là email test từ Firestore trigger.</p>
              <p><strong>Mã OTP:</strong> ${emailData.data.code}</p>
              <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
              <p>Nếu bạn nhận được email này, có nghĩa là email queue đã hoạt động! 🎉</p>
            </div>
          `;
          subject = '🧪 Test Email Queue - Quiz App';
          break;
        default:
          throw new Error('Unknown email template');
      }

      // Gửi email
      const info = await transporter.sendMail({
        from: `"Quiz App" <${functions.config().email?.user}>`,
        to: emailData.to,
        subject: subject,
        html: htmlContent
      });

      // Cập nhật status thành công
      await snap.ref.update({
        status: 'sent',
        messageId: info.messageId,
        sentAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Email sent successfully to ${emailData.to}, messageId: ${info.messageId}`);

    } catch (error) {
      console.error('Error sending email:', error);
      
      // Cập nhật status thất bại
      await snap.ref.update({
        status: 'failed',
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Test SMTP connection
exports.testSMTPConnection = functions.https.onCall(async (data, context) => {
  try {
    // Verify SMTP connection
    await transporter.verify();
    
    return {
      success: true,
      message: 'SMTP connection successful',
      config: {
        service: 'gmail',
        user: functions.config().email?.user || 'Not configured'
      }
    };
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
