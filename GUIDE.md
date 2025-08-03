# 🎯 QuizTrivia App - Hệ thống Quiz Hiện đại

## 📋 Tổng quan
QuizTrivia App là một ứng dụng web quiz hiện đại được xây dựng với React, TypeScript, Firebase và Tailwind CSS. Ứng dụng cung cấp giao diện trực quan, tính năng quản lý quiz toàn diện và hệ thống phân quyền linh hoạt.

## ✨ Tính năng chính

### 🏠 Dành cho User
- **Làm quiz**: Giao diện làm quiz mượt mà với timer và tính điểm tự động
- **Xem kết quả**: Hiển thị chi tiết điểm số và câu trả lời đúng/sai
- **Yêu thích**: Lưu các quiz yêu thích để làm lại
- **Bảng xếp hạng**: Xem thứ hạng cá nhân và toàn server
- **Lịch sử**: Theo dõi tiến độ học tập qua thời gian

### 👑 Dành cho Admin
- **🎨 Tạo Quiz**: Giao diện tạo quiz hiện đại với nhiều loại câu hỏi
- **📝 Duyệt Quiz**: Quản lý và duyệt quiz từ người dùng khác
- **🏷️ Quản lý Danh mục**: Tạo và quản lý categories với icon và màu sắc
- **👥 Quản lý User**: Phân quyền và quản lý người dùng
- **📊 Thống kê**: Dashboard với biểu đồ và số liệu chi tiết
- **🛠️ Utilities**: Công cụ tạo dữ liệu test và backup

## 🚀 Cách chạy dự án

### Yêu cầu hệ thống
- Node.js 18+ 
- NPM hoặc Yarn
- Firebase account

### Cài đặt
```bash
# Clone dự án
git clone <repository-url>
cd QuizTrivia-App

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build
```

### Cấu hình Firebase
1. Tạo project Firebase mới
2. Cấu hình Authentication (Email/Password)
3. Tạo Firestore Database
4. Cập nhật file `src/lib/firebase/config.ts` với thông tin project

## 🎯 Hướng dẫn sử dụng

### Đăng nhập Admin
- Email: `admin123@gmail.com`
- Password: Tự đặt khi đăng ký

### Quy trình tạo Quiz
1. **Đăng nhập** với tài khoản Admin
2. **Truy cập Creator** từ menu sidebar hoặc admin dashboard
3. **Điền thông tin cơ bản**:
   - Tiêu đề thu hút
   - Mô tả chi tiết
   - Chọn danh mục và độ khó
   - Đặt thời gian làm bài
   - Thêm tags và hình ảnh (tuỳ chọn)
4. **Tạo câu hỏi**:
   - Hỗ trợ 4 loại: Multiple choice, True/False, Short answer, Image
   - Kéo thả để sắp xếp thứ tự
   - Preview real-time
5. **Xem lại và xuất bản**

### Quy trình duyệt Quiz
1. **Truy cập Admin → Duyệt Quiz**
2. **Xem danh sách** quiz pending/approved/rejected
3. **Preview quiz** để kiểm tra chất lượng
4. **Duyệt/Từ chối** với lý do cụ thể
5. **Quản lý** quiz đã được duyệt

## 🏗️ Kiến trúc dự án

### Frontend (React + TypeScript)
```
src/
├── features/           # Feature-based modules
│   ├── auth/          # Authentication
│   ├── quiz/          # Quiz functionality  
│   └── admin/         # Admin features
├── shared/            # Shared components
├── lib/               # Libraries & config
└── utils/             # Utility functions
```

### Backend (Firebase)
- **Authentication**: Firebase Auth với role-based access
- **Database**: Firestore với collections:
  - `users` - Thông tin người dùng
  - `quizzes` - Dữ liệu quiz
  - `categories` - Danh mục quiz
  - `quiz_results` - Kết quả làm bài
  - `system_notifications` - Thông báo hệ thống

### Styling (Tailwind CSS)
- Responsive design
- Modern gradient và shadow
- Dark/Light mode ready
- Custom components với consistent design

## 🎨 Design System

### Colors
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981) 
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Gray scale**: Modern gray palette

### Typography
- **Headings**: Font weight 700-900
- **Body**: Font weight 400-500
- **Small text**: Font weight 400

### Components
- **Buttons**: Rounded corners, hover effects, loading states
- **Cards**: Subtle shadow, border radius 12px
- **Forms**: Modern input styling với focus states
- **Modals**: Backdrop blur, smooth animations

## 🔧 Các tính năng nâng cao

### Quiz Creator
- **Drag & Drop**: Sắp xếp câu hỏi bằng kéo thả
- **Real-time Preview**: Xem trước quiz trong quá trình tạo
- **Auto-save**: Tự động lưu draft
- **Import/Export**: Hỗ trợ import từ CSV/Excel

### Admin Dashboard
- **Real-time Stats**: Cập nhật số liệu theo thời gian thực
- **Advanced Filters**: Lọc quiz theo status, category, date
- **Bulk Actions**: Thao tác hàng loạt với nhiều quiz
- **Activity Logs**: Theo dõi hoạt động của admin

### User Experience
- **Progressive Loading**: Lazy loading cho components
- **Offline Support**: Cache quiz đã tải
- **Mobile Optimized**: Responsive design cho mọi thiết bị
- **Accessibility**: WCAG 2.1 compliant

## 📊 Performance & SEO

### Performance Optimizations
- **Code Splitting**: Lazy loading routes và components
- **Image Optimization**: WebP format, lazy loading
- **Bundle Size**: Optimized build với tree shaking
- **Caching**: Service worker cho static assets

### SEO Features  
- **Meta Tags**: Dynamic meta tags cho từng trang
- **Structured Data**: JSON-LD cho quiz content
- **Sitemap**: Auto-generated sitemap
- **Analytics**: Google Analytics integration

## 🛡️ Security & Privacy

### Security Measures
- **Role-based Access**: Phân quyền chi tiết
- **Input Validation**: Client & server side validation
- **XSS Protection**: Sanitize user input
- **CSRF Protection**: Token-based protection

### Privacy Features
- **Data Encryption**: Encrypt sensitive data
- **GDPR Compliance**: User data management
- **Audit Logs**: Track user actions
- **Backup & Recovery**: Automated backup system

## 🚀 Deployment

### Build cho Production
```bash
npm run build
```

### Deploy lên Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## 🤝 Contributing

### Development Workflow
1. Fork repository
2. Tạo feature branch
3. Implement feature với tests
4. Submit pull request
5. Code review & merge

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

## 📚 Documentation

### API Documentation
- Firestore collections structure
- Authentication flow diagrams
- Component props interfaces
- State management patterns

### User Guides
- Admin manual
- User tutorial videos
- FAQ section
- Troubleshooting guide

## 🎯 Roadmap

### v2.0 Features
- [ ] Real-time multiplayer quiz
- [ ] Video question support
- [ ] AI-powered question generation
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Webhook integrations
- [ ] Custom themes
- [ ] White-label solution

### Performance Goals
- [ ] Lighthouse score 95+
- [ ] Sub-2s page load times
- [ ] 99.9% uptime
- [ ] Mobile Core Web Vitals optimization

## 🐛 Known Issues & Solutions

### Common Issues
1. **Firebase connection errors**: Check network và API keys
2. **Build failures**: Clear node_modules và reinstall
3. **TypeScript errors**: Update to latest definitions
4. **Performance issues**: Enable production mode

### Debugging Tips
- Use React DevTools
- Check browser console
- Monitor Firebase logs
- Use network tab for API calls

## 📞 Support

- **Documentation**: README files trong mỗi feature folder
- **Issues**: GitHub Issues cho bug reports
- **Discord**: Community support channel
- **Email**: Technical support contact

---

**Made with ❤️ by QuizTrivia Team**

*Dự án được xây dựng với mục tiêu tạo ra một nền tảng quiz hiện đại, dễ sử dụng và có thể mở rộng cho cộng đồng học tập.*
