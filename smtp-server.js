// Simple Node.js SMTP Server for Quiz App
// Run: node smtp-server.js

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// SMTP Configuration từ thông tin user cung cấp
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'lequytoanptit0303@gmail.com',
    pass: 'zzeh rnuz bmwz sqsa' // App password từ hình ảnh
  }
};

// Tạo transporter
const transporter = nodemailer.createTransporter(SMTP_CONFIG);

// Test connection khi start server
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP connection failed:', error);
  } else {
    console.log('✅ SMTP server ready to send emails');
  }
});

// Template email OTP
const getOTPEmailHTML = (code) => {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mã xác thực Quiz App</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8fafc;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .content {
                padding: 40px 30px;
            }
            .otp-container {
                background: #f8fafc;
                border: 2px dashed #667eea;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 48px;
                font-weight: bold;
                color: #667eea;
                letter-spacing: 8px;
                margin: 10px 0;
                font-family: 'Courier New', monospace;
            }
            .footer {
                background: #f8fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🧠 Quiz App</div>
                <h1>Xác thực email đăng ký</h1>
            </div>
            
            <div class="content">
                <h2>Mã xác thực của bạn</h2>
                <p>Vui lòng sử dụng mã xác thực bên dưới để hoàn tất quá trình đăng ký:</p>
                
                <div class="otp-container">
                    <div class="otp-code">${code}</div>
                    <p style="margin: 0; color: #64748b;">Mã này có hiệu lực trong 10 phút</p>
                </div>
                
                <p><strong>Lưu ý:</strong> Không chia sẻ mã này với bất kỳ ai!</p>
            </div>
            
            <div class="footer">
                <p><strong>Quiz App Team</strong></p>
                <p>© 2025 Quiz App. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// API endpoint để gửi OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { to, code } = req.body;
    
    if (!to || !code) {
      return res.status(400).json({
        success: false,
        error: 'Missing email or OTP code'
      });
    }

    console.log(`📧 Sending OTP ${code} to ${to}...`);

    // Gửi email
    const info = await transporter.sendMail({
      from: `"Quiz App" <${SMTP_CONFIG.auth.user}>`,
      to: to,
      subject: 'Mã xác thực đăng ký Quiz App',
      html: getOTPEmailHTML(code)
    });

    console.log(`✅ Email sent: ${info.messageId}`);

    res.json({
      success: true,
      messageId: info.messageId,
      message: `OTP sent successfully to ${to}`
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'SMTP server is running',
    config: {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      user: SMTP_CONFIG.auth.user
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SMTP Server running on http://localhost:${PORT}`);
  console.log(`📧 Email: ${SMTP_CONFIG.auth.user}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SMTP Server shutting down...');
  process.exit(0);
});
