const nodemailer = require('nodemailer');

// Cấu hình SMTP - THAY ĐỔI THÔNG TIN NÀY
const SMTP_CONFIG = {
  service: 'gmail', // hoặc 'hotmail', 'yahoo', etc.
  user: 'your-email@gmail.com', // Email của bạn
  password: 'your-app-password' // App password (không phải mật khẩu Gmail)
};

const TEST_EMAIL = 'recipient@example.com'; // Email nhận test

// Tạo transporter
const transporter = nodemailer.createTransport({
  service: SMTP_CONFIG.service,
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.password
  }
});

// Template email OTP
const getTestEmailTemplate = (code) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .otp-code { background: #f0f8ff; border: 2px dashed #0066cc; padding: 20px; text-align: center; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🧪 Test Email - Quiz App</h2>
        <p>Đây là email test từ Node.js script.</p>
        
        <div class="otp-code">
          <div class="code">${code}</div>
          <p>Mã OTP test</p>
        </div>
        
        <p><strong>Thông tin test:</strong></p>
        <ul>
          <li>Thời gian: ${new Date().toLocaleString('vi-VN')}</li>
          <li>SMTP Service: ${SMTP_CONFIG.service}</li>
          <li>From: ${SMTP_CONFIG.user}</li>
        </ul>
        
        <p>Nếu bạn nhận được email này, SMTP đã hoạt động tốt! 🎉</p>
      </div>
    </body>
    </html>
  `;
};

async function testSMTPConnection() {
  console.log('🔍 Testing SMTP connection...');
  
  try {
    // Test connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}

async function sendTestEmail() {
  console.log('📧 Sending test email...');
  
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const info = await transporter.sendMail({
      from: `"Quiz App Test" <${SMTP_CONFIG.user}>`,
      to: TEST_EMAIL,
      subject: '🧪 Test Email - Quiz App SMTP',
      html: getTestEmailTemplate(otp)
    });

    console.log('✅ Email sent successfully!');
    console.log('📩 Message ID:', info.messageId);
    console.log('📧 To:', TEST_EMAIL);
    console.log('🔢 OTP:', otp);
    
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting SMTP Test...\n');
  
  // Kiểm tra cấu hình
  if (SMTP_CONFIG.user === 'your-email@gmail.com' || SMTP_CONFIG.password === 'your-app-password') {
    console.log('⚠️  VUI LÒNG CẬP NHẬT THÔNG TIN SMTP TRONG FILE test-local.js');
    console.log('   - SMTP_CONFIG.user: Email của bạn');
    console.log('   - SMTP_CONFIG.password: App password');
    console.log('   - TEST_EMAIL: Email nhận test\n');
    return;
  }
  
  if (TEST_EMAIL === 'recipient@example.com') {
    console.log('⚠️  VUI LÒNG CẬP NHẬT TEST_EMAIL trong file test-local.js\n');
    return;
  }
  
  // Test connection
  const connectionOk = await testSMTPConnection();
  if (!connectionOk) {
    console.log('\n🔧 Các bước khắc phục:');
    console.log('1. Kiểm tra email và app password');
    console.log('2. Bật 2-Factor Authentication cho Gmail');
    console.log('3. Tạo App Password: https://myaccount.google.com/apppasswords');
    console.log('4. Sử dụng App Password thay vì mật khẩu Gmail');
    return;
  }
  
  console.log('');
  
  // Send test email
  const emailOk = await sendTestEmail();
  if (emailOk) {
    console.log('\n🎉 Test hoàn tất! Kiểm tra email của bạn.');
    console.log('   (Nhớ check cả spam folder)');
  } else {
    console.log('\n❌ Test thất bại. Kiểm tra logs phía trên.');
  }
}

// Chạy test
main().catch(console.error);
