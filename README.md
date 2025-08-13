# QuizTrivia App

Ứng dụng Quiz trực tuyến hiện đại với đầy đủ tính năng, được xây dựng bằng React, TypeScript và Firebase.

## 🚀 Tính năng chính

### 👤 Quản lý người dùng
- Đăng ký/Đăng nhập với Firebase Auth
- Hồ sơ người dùng với thống kê chi tiết
- Hệ thống vai trò (User, Admin)
- Xác thực OTP qua email

### 📝 Quiz System
- Tạo quiz với nhiều loại câu hỏi (Multiple choice, True/False, Short answer, Image)
- Import câu hỏi từ file (PDF, DOC, CSV, Excel)
- Tạo câu hỏi tự động với AI (OpenAI, Gemini)
- Hệ thống đánh giá và review quiz
- Favorites và bookmark quiz

### 🎮 Gameplay
- Quiz với timer và scoring system
- Kết quả chi tiết với phân tích performance
- Leaderboard real-time
- Multiplayer mode (đang phát triển)

### 🏆 Admin Panel
- Quản lý người dùng và quiz
- Thống kê chi tiết với biểu đồ
- Bulk actions và quick actions
- Preview và edit quiz

### 🌐 Internationalization
- Hỗ trợ đa ngôn ngữ (Tiếng Việt, English)
- Hệ thống i18n tự động
- Translation management

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** với TypeScript
- **Vite** - Build tool nhanh
- **Tailwind CSS** - Styling
- **Redux Toolkit** - State management
- **React Router** - Routing
- **React Hook Form** - Form handling
- **React Toastify** - Notifications

### Backend & Services
- **Firebase** - Authentication, Database, Storage
- **Firestore** - NoSQL database
- **OpenAI API** - AI question generation
- **Google Gemini AI** - Alternative AI service
- **EmailJS** - Email service

### Development Tools
- **Jest** - Testing framework
- **ESLint** - Code linting
- **TypeScript** - Type safety
- **i18next** - Internationalization

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js 16+ 
- npm hoặc yarn

### Cài đặt dependencies
```bash
npm install
```

### Cấu hình môi trường
Tạo file `.env.local` trong thư mục gốc:
```env
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_APP_VERSION=1.0.0
```

### Chạy ứng dụng
```bash
# Development mode
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## 🧪 Testing

```bash
# Chạy tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

## 📁 Cấu trúc dự án

```
src/
├── features/           # Feature-based modules
│   ├── auth/          # Authentication
│   ├── quiz/          # Quiz management
│   ├── admin/         # Admin panel
│   └── multiplayer/   # Multiplayer features
├── shared/            # Shared components
├── lib/               # Utilities and configs
├── services/          # External services
└── types/             # TypeScript types
```

## 🔧 Cấu hình Firebase

1. Tạo project Firebase mới
2. Bật Authentication với Email/Password
3. Tạo Firestore database
4. Cập nhật security rules
5. Thêm cấu hình vào `src/lib/firebase/config.ts`

## 🎨 Customization

### Themes
Ứng dụng sử dụng Tailwind CSS, có thể tùy chỉnh trong `tailwind.config.js`

### Internationalization
- Thêm ngôn ngữ mới trong `public/locales/`
- Sử dụng `useTranslation()` hook
- Scripts hữu ích:
  - `npm run i18n:normalize` - Chuẩn hóa locales, xóa nhóm duplicate
  - `npm run i18n:compare` - So sánh VI↔EN, báo key thiếu/khác
  - `npm run i18n:reverse` - Codemod reverse-lookup thay literal bằng `t('key')`
  - `npm run i18n:extract` - Quét key `t()` trong mã nguồn
  - `npm run i18n:validate` - Đối chiếu key với locales
  - `npm run i18n:fix` - Sửa nhanh (normalize + fix + update-components + translate)
  - `npm run i18n:audit` - Báo cáo tổng hợp

### AI Integration
- Cấu hình OpenAI API key
- Cấu hình Gemini API key
- Tùy chỉnh prompts trong `src/services/`

## 🚀 Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy
```

### Vercel
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist/ folder
```

## 📊 Performance

- **Lazy loading** cho tất cả routes
- **Code splitting** tự động với Vite
- **Image optimization** với lazy loading
- **Caching** với Firebase
- **Bundle size** được tối ưu

## 🔒 Security

- **Firebase Security Rules** cho Firestore
- **Input validation** với TypeScript
- **XSS protection** với DOMPurify
- **Authentication** với Firebase Auth
- **Rate limiting** cho API calls

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📝 License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 🆘 Support

- **Issues**: Tạo issue trên GitHub
- **Documentation**: Xem docs trong thư mục `docs/`
- **Community**: Tham gia Discord server

## 🗺️ Roadmap

### V2.0 (Đang phát triển)
- [ ] Multiplayer mode hoàn chỉnh
- [ ] Voice chat integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Tournament system

### V3.0 (Tương lai)
- [ ] AI-powered adaptive quizzes
- [ ] Virtual reality support
- [ ] Blockchain integration
- [ ] Advanced multiplayer features

---

**QuizTrivia App** - Nền tảng quiz hiện đại cho mọi người! 🎯
