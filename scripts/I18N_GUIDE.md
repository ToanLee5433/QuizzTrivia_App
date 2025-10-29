# 🌐 Hệ Thống i18n Tự Động - Hướng Dẫn Sử Dụng

## 📋 Tổng Quan

Hệ thống i18n tự động này bao gồm 4 scripts chính giúp bạn:
1. Xây dựng lại file translation từ đầu
2. Quét toàn bộ mã nguồn và thêm translation tự động
3. Thay thế chuỗi hard-coded bằng lời gọi `t()`
4. Chạy tất cả các bước trên tự động

## 🚀 Cách Sử Dụng Nhanh

### Cách 1: Chạy Tất Cả (Khuyến Nghị)

```bash
node scripts/setup-i18n-complete.mjs
```

Script này sẽ:
- ✅ Xây dựng lại file Vietnamese translations
- ✅ Quét mã nguồn và thêm translation thiếu
- ✅ Chạy dry run để xem trước thay đổi

### Cách 2: Chạy Từng Bước

#### Bước 1: Xây Dựng Lại Translations

```bash
node scripts/rebuild-vi-translations.mjs
```

**Chức năng:**
- Đọc file English translations
- Dịch sang tiếng Việt sử dụng dictionary có sẵn
- Xóa các file backup cũ
- Tạo file mới sạch sẽ

**Output:**
- `public/locales/vi/common.json` - File translation tiếng Việt mới
- Console log: Số lượng keys đã dịch

#### Bước 2: Hoàn Thiện i18n Tự Động

```bash
node scripts/complete-i18n-auto.mjs
```

**Chức năng:**
- Quét toàn bộ thư mục `src/`
- Tìm tất cả chuỗi tiếng Việt hard-coded
- Tạo translation keys tự động
- Dịch sang tiếng Anh
- Cập nhật cả 2 file vi/en

**Output:**
- Cập nhật `public/locales/vi/common.json`
- Cập nhật `public/locales/en/common.json`
- `scripts/i18n-completion-report.json` - Báo cáo chi tiết

#### Bước 3: Xem Trước Thay Đổi (Dry Run)

```bash
node scripts/auto-replace-hardcoded-strings.mjs --dry-run
```

**Chức năng:**
- Quét các file source code
- Tìm chuỗi matching với translations
- Hiển thị những thay đổi sẽ được thực hiện
- **KHÔNG** thay đổi file thực tế

**Output:**
- Console log: Danh sách file và số thay đổi
- `scripts/string-replacement-report.json`

#### Bước 4: Thực Hiện Thay Đổi (Thật)

```bash
node scripts/auto-replace-hardcoded-strings.mjs
```

**Chức năng:**
- Thay thế chuỗi hard-coded bằng `t('key')`
- Thêm `import { useTranslation }` nếu cần
- Thêm `const { t } = useTranslation()` nếu cần
- Lưu file đã thay đổi

**⚠️ CHÚ Ý:** Script này sẽ thay đổi code! Hãy commit trước khi chạy.

## 📊 Các File Output

### 1. Translation Files

```
public/locales/
├── vi/
│   └── common.json    # Translations tiếng Việt
└── en/
    └── common.json    # Translations tiếng Anh
```

### 2. Report Files

```
scripts/
├── i18n-completion-report.json        # Báo cáo completion
└── string-replacement-report.json     # Báo cáo replacement
```

## 🔍 Cấu Trúc Translation Key

Script tự động tạo key theo quy tắc:

```javascript
// Ví dụ:
"Đăng nhập" → "dangNhap"
"Tạo quiz mới" → "taoQuizMoi"
"Đã xóa thành công" → "daXoaThanhCong"
```

**Quy tắc:**
- Loại bỏ dấu tiếng Việt
- Chuyển sang camelCase
- Giới hạn 50 ký tự
- Đảm bảo unique

## 🎯 Ví Dụ Sử Dụng

### Trước khi chạy:

```tsx
// src/components/Button.tsx
export default function Button() {
  return <button>Đăng nhập</button>;
}
```

### Sau khi chạy `auto-replace-hardcoded-strings.mjs`:

```tsx
// src/components/Button.tsx
import { useTranslation } from 'react-i18next';

export default function Button() {
  const { t } = useTranslation();
  
  return <button>{t('dangNhap')}</button>;
}
```

### Translation files:

```json
// public/locales/vi/common.json
{
  "dangNhap": "Đăng nhập"
}

// public/locales/en/common.json
{
  "dangNhap": "Login"
}
```

## ⚙️ Cấu Hình

Bạn có thể sửa cấu hình trong từng script:

```javascript
const config = {
  sourceDir: path.join(__dirname, '../src'),
  localesDir: path.join(__dirname, '../public/locales'),
  languages: ['vi', 'en'],
  defaultLanguage: 'vi',
  excludePaths: ['node_modules', 'dist', 'build', '.git'],
  fileExtensions: ['.tsx', '.ts', '.jsx', '.js'],
};
```

## 🛠️ Troubleshooting

### Vấn đề 1: File JSON không hợp lệ

**Giải pháp:**
```bash
# Xây dựng lại từ đầu
node scripts/rebuild-vi-translations.mjs
```

### Vấn đề 2: Translation bị trùng

**Giải pháp:**
```bash
# Xóa file cũ và chạy lại
rm public/locales/vi/common.backup.json
rm public/locales/vi/common_fixed.json
node scripts/setup-i18n-complete.mjs
```

### Vấn đề 3: Import bị sai sau khi replace

**Giải pháp:**
- Kiểm tra file bằng tay
- Sửa import statements
- Chạy `npm run build` để verify

### Vấn đề 4: Một số chuỗi không được replace

**Nguyên nhân:**
- Chuỗi quá ngắn (< 3 ký tự)
- Chuỗi trong comment
- Chuỗi động (template literals phức tạp)

**Giải pháp:**
- Thêm vào translation file bằng tay
- Sử dụng t() manually

## 📝 Best Practices

### 1. Luôn Commit Trước Khi Chạy

```bash
git add .
git commit -m "Before i18n auto setup"
node scripts/auto-replace-hardcoded-strings.mjs
```

### 2. Kiểm Tra Dry Run Trước

```bash
node scripts/auto-replace-hardcoded-strings.mjs --dry-run
# Review output
# Nếu OK:
node scripts/auto-replace-hardcoded-strings.mjs
```

### 3. Test Sau Khi Replace

```bash
npm run dev
# Test các tính năng
# Đổi ngôn ngữ
# Kiểm tra các trang
```

### 4. Build Production

```bash
npm run build
# Kiểm tra không có lỗi
```

## 🎨 Thêm Translation Key Mới

### Thủ Công:

```json
// public/locales/vi/common.json
{
  "myNewKey": "Văn bản tiếng Việt"
}

// public/locales/en/common.json
{
  "myNewKey": "English text"
}
```

### Sử Dụng Trong Code:

```tsx
const { t } = useTranslation();
return <div>{t('myNewKey')}</div>;
```

### Với Tham Số:

```json
{
  "welcomeUser": "Chào mừng {{name}}"
}
```

```tsx
{t('welcomeUser', { name: userName })}
```

## 📚 Tài Liệu Tham Khảo

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)

## 🤝 Đóng Góp

Nếu bạn tìm thấy bug hoặc có ý tưởng cải thiện:
1. Báo cáo issue
2. Tạo pull request
3. Cải thiện translation dictionary

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

---

**Tạo bởi:** QuizTrivia Development Team  
**Ngày cập nhật:** 30/10/2025  
**Phiên bản:** 1.0.0
