# 🚀 Hướng dẫn Setup EmailJS - Loại bỏ start-smtp.bat

## 📋 Tổng quan
EmailJS cho phép gửi email trực tiếp từ browser mà không cần server riêng. Điều này giúp:
- ✅ Loại bỏ hoàn toàn `start-smtp.bat`
- ✅ Không cần chạy Node.js server riêng
- ✅ Gửi email thực qua Gmail
- ✅ Miễn phí cho 200 emails/tháng

## 🔧 Bước 1: Đăng ký EmailJS

1. Truy cập: https://www.emailjs.com/
2. Đăng ký tài khoản miễn phí
3. Xác thực email

## 📧 Bước 2: Kết nối Gmail

1. Vào **Email Services** → **Add New Service**
2. Chọn **Gmail**
3. Đăng nhập bằng Gmail: `lequytoanptit0303@gmail.com`
4. Cho phép EmailJS truy cập Gmail
5. Lưu **Service ID** (ví dụ: `service_abcd123`)

## 📝 Bước 3: Tạo Email Template

1. Vào **Email Templates** → **Create New Template**
2. Đặt tên: `OTP Verification`
3. Dán nội dung sau:

```
Subject: Mã xác thực Quiz Trivia App

Body:
Chào bạn,

Mã xác thực đăng ký tài khoản Quiz Trivia App của bạn là:

**{{otp_code}}**

Mã này có hiệu lực trong 10 phút.

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.

Trân trọng,
Quiz-App
```

4. Lưu **Template ID** (ví dụ: `template_xyz789`)

## 🔑 Bước 4: Lấy Public Key

1. Vào **Account** → **General**
2. Copy **Public Key** (ví dụ: `user_abc123def456`)

## ⚙️ Bước 5: Cập nhật Code

Mở file `src/services/emailJSService.ts` và thay thế:

```typescript
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_abcd123', // Thay bằng Service ID của bạn
  TEMPLATE_ID: 'template_xyz789', // Thay bằng Template ID của bạn
  PUBLIC_KEY: 'user_abc123def456' // Thay bằng Public Key của bạn
};
```

## 🚀 Bước 6: Test hệ thống

1. Build và chạy app:
```bash
npm run build
npm run dev
```

2. Thử đăng ký tài khoản mới
3. Kiểm tra email trong hộp thư

## 🗑️ Bước 7: Dọn dẹp (Tùy chọn)

Sau khi EmailJS hoạt động, bạn có thể xóa các file không cần:
- `start-smtp.bat`
- `smtp-server.js`
- `src/services/directSMTPService.ts`

## 📊 Giới hạn EmailJS

**Gói miễn phí:**
- 200 emails/tháng
- Không giới hạn templates
- Không có watermark

**Nếu cần nhiều hơn:**
- Personal: $5/tháng (1,000 emails)
- Professional: $15/tháng (5,000 emails)

## 🔍 Troubleshooting

**Lỗi thường gặp:**
1. **"Template not found"** → Kiểm tra Template ID
2. **"Service not found"** → Kiểm tra Service ID
3. **"Invalid public key"** → Kiểm tra Public Key
4. **"Gmail authentication failed"** → Đăng nhập lại Gmail trong EmailJS

**Debug:**
- Mở Developer Tools → Console để xem log
- Kiểm tra tại EmailJS Dashboard → Logs

## ✅ Ưu điểm của EmailJS so với SMTP server

| Tiêu chí | EmailJS | SMTP Server |
|----------|---------|-------------|
| Setup | Dễ dàng | Phức tạp |
| Maintenance | Không cần | Cần quản lý |
| Server dependency | Không | Có |
| Security | EmailJS quản lý | Tự quản lý |
| Cost | Miễn phí 200 emails | Miễn phí |
| Scalability | Tự động | Thủ công |

---

💡 **Lưu ý:** EmailJS phù hợp cho ứng dụng nhỏ-vừa. Với ứng dụng lớn (>1000 emails/tháng), nên xem xét SendGrid, AWS SES hoặc solutions khác.
