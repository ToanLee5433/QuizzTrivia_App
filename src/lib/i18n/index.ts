import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  vi: {
    translation: {
      // Common
      "common": {
        "loading": "Đang tải...",
        "save": "Lưu",
        "cancel": "Hủy",
        "delete": "Xóa",
        "edit": "Chỉnh sửa",
        "create": "Tạo mới",
        "update": "Cập nhật",
        "search": "Tìm kiếm",
        "filter": "Lọc",
        "sort": "Sắp xếp",
        "yes": "Có",
        "no": "Không",
        "ok": "Đồng ý",
        "back": "Quay lại",
        "next": "Tiếp theo",
        "previous": "Trước đó",
        "close": "Đóng",
        "open": "Mở",
        "view": "Xem",
        "download": "Tải xuống",
        "upload": "Tải lên"
      },
      
      // Navigation
      "nav": {
        "home": "Trang chủ",
        "quizzes": "Quiz",
        "favorites": "Yêu thích",
        "leaderboard": "Bảng xếp hạng",
        "profile": "Hồ sơ",
        "creator": "Creator",
        "admin": "Quản trị",
        "login": "Đăng nhập",
        "logout": "Đăng xuất",
        "register": "Đăng ký"
      },
      
      // Auth
      "auth": {
        "login": "Đăng nhập",
        "register": "Đăng ký",
        "email": "Email",
        "password": "Mật khẩu",
        "confirmPassword": "Xác nhận mật khẩu",
        "displayName": "Tên hiển thị",
        "loginSuccess": "Đăng nhập thành công!",
        "registerSuccess": "Đăng ký thành công!",
        "loginWithGoogle": "Đăng nhập với Google",
        "forgotPassword": "Quên mật khẩu?",
        "emailVerification": "Xác thực email",
        "emailVerificationSent": "Email xác thực đã được gửi! Hãy kiểm tra hộp thư và click vào link xác thực.",
        "emailNotVerified": "Tài khoản của bạn chưa được xác thực email. Vui lòng kiểm tra hộp thư và click vào link xác thực, sau đó thử đăng nhập lại.",
        "welcomeBack": "Chào mừng trở lại với Quiz App",
        "createNewAccount": "Tạo tài khoản mới"
      },
      
      // Quiz
      "quiz": {
        "title": "Tiêu đề",
        "description": "Mô tả",
        "category": "Danh mục",
        "difficulty": "Độ khó",
        "duration": "Thời gian",
        "questions": "Câu hỏi",
        "question": "Câu hỏi",
        "answer": "Câu trả lời",
        "correctAnswer": "Đáp án đúng",
        "startQuiz": "Bắt đầu Quiz",
        "submitQuiz": "Nộp bài",
        "score": "Điểm số",
        "result": "Kết quả",
        "playNow": "Chơi ngay",
        "preview": "Xem trước",
        "create": "Tạo Quiz",
        "myQuizzes": "Quiz của tôi",
        "popularQuizzes": "Quiz phổ biến",
        "completed": "Đã hoàn thành",
        "attempts": "Lượt chơi",
        "averageScore": "Điểm trung bình",
        "players": "Người chơi",
        "tags": "Thẻ",
        "published": "Đã xuất bản",
        "draft": "Bản nháp"
      },
      
      // Dashboard
      "dashboard": {
        "welcome": "Chào mừng trở lại, {{name}}!",
        "totalQuizzes": "Tổng số Quiz",
        "totalUsers": "Người dùng",
        "completedQuizzes": "Quiz hoàn thành",
        "totalCreators": "Người tạo",
        "realTimeData": "Dữ liệu thực tế",
        "registered": "Đã đăng ký",
        "pending": "Chờ cập nhật",
        "creatorsAndAdmins": "Creator + Admin"
      },
      
      // Profile
      "profile": {
        "myProfile": "Hồ sơ của tôi",
        "editProfile": "Chỉnh sửa hồ sơ",
        "changePassword": "Đổi mật khẩu",
        "currentPassword": "Mật khẩu hiện tại",
        "newPassword": "Mật khẩu mới",
        "confirmNewPassword": "Xác nhận mật khẩu mới",
        "updateProfile": "Cập nhật hồ sơ",
        "avatarUrl": "URL Avatar",
        "passwordChangeSuccess": "Đổi mật khẩu thành công!",
        "passwordChangeError": "Có lỗi khi đổi mật khẩu",
        "currentPasswordRequired": "Bạn cần nhập đúng mật khẩu hiện tại để xác thực trước khi đổi mật khẩu mới"
      },
      
      // Admin
      "admin": {
        "dashboard": "Bảng điều khiển Admin",
        "userManagement": "Quản lý người dùng",
        "quizManagement": "Quản lý Quiz",
        "categoryManagement": "Quản lý danh mục",
        "statistics": "Thống kê",
        "settings": "Cài đặt"
      },
      
      // Categories
      "categories": {
        "programming": "Lập trình",
        "webDevelopment": "Phát triển Web",
        "science": "Khoa học",
        "mathematics": "Toán học",
        "generalKnowledge": "Kiến thức tổng hợp",
        "history": "Lịch sử",
        "sports": "Thể thao",
        "entertainment": "Giải trí"
      },
      
      // Difficulty levels
      "difficulty": {
        "easy": "Dễ",
        "medium": "Trung bình",
        "hard": "Khó"
      },
      
      // Messages
      "messages": {
        "error": "Có lỗi xảy ra",
        "success": "Thành công",
        "noData": "Không có dữ liệu",
        "networkError": "Lỗi kết nối mạng",
        "unauthorized": "Không có quyền truy cập",
        "notFound": "Không tìm thấy",
        "serverError": "Lỗi máy chủ"
      }
    }
  },
  en: {
    translation: {
      // Common
      "common": {
        "loading": "Loading...",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "create": "Create",
        "update": "Update",
        "search": "Search",
        "filter": "Filter",
        "sort": "Sort",
        "yes": "Yes",
        "no": "No",
        "ok": "OK",
        "back": "Back",
        "next": "Next",
        "previous": "Previous",
        "close": "Close",
        "open": "Open",
        "view": "View",
        "download": "Download",
        "upload": "Upload"
      },
      
      // Navigation
      "nav": {
        "home": "Home",
        "quizzes": "Quizzes",
        "favorites": "Favorites",
        "leaderboard": "Leaderboard",
        "profile": "Profile",
        "creator": "Creator",
        "admin": "Admin",
        "login": "Login",
        "logout": "Logout",
        "register": "Register"
      },
      
      // Auth
      "auth": {
        "login": "Login",
        "register": "Register",
        "email": "Email",
        "password": "Password",
        "confirmPassword": "Confirm Password",
        "displayName": "Display Name",
        "loginSuccess": "Login successful!",
        "registerSuccess": "Registration successful!",
        "loginWithGoogle": "Sign in with Google",
        "forgotPassword": "Forgot password?",
        "emailVerification": "Email Verification",
        "emailVerificationSent": "Verification email sent! Please check your inbox and click the verification link.",
        "emailNotVerified": "Your account has not been verified. Please check your email and click the verification link, then try logging in again.",
        "welcomeBack": "Welcome back to Quiz App",
        "createNewAccount": "Create new account"
      },
      
      // Quiz
      "quiz": {
        "title": "Title",
        "description": "Description",
        "category": "Category",
        "difficulty": "Difficulty",
        "duration": "Duration",
        "questions": "Questions",
        "question": "Question",
        "answer": "Answer",
        "correctAnswer": "Correct Answer",
        "startQuiz": "Start Quiz",
        "submitQuiz": "Submit Quiz",
        "score": "Score",
        "result": "Result",
        "playNow": "Play Now",
        "preview": "Preview",
        "create": "Create Quiz",
        "myQuizzes": "My Quizzes",
        "popularQuizzes": "Popular Quizzes",
        "completed": "Completed",
        "attempts": "Attempts",
        "averageScore": "Average Score",
        "players": "Players",
        "tags": "Tags",
        "published": "Published",
        "draft": "Draft"
      },
      
      // Dashboard
      "dashboard": {
        "welcome": "Welcome back, {{name}}!",
        "totalQuizzes": "Total Quizzes",
        "totalUsers": "Users",
        "completedQuizzes": "Completed Quizzes",
        "totalCreators": "Creators",
        "realTimeData": "Real-time Data",
        "registered": "Registered",
        "pending": "Pending Update",
        "creatorsAndAdmins": "Creators + Admins"
      },
      
      // Profile
      "profile": {
        "myProfile": "My Profile",
        "editProfile": "Edit Profile",
        "changePassword": "Change Password",
        "currentPassword": "Current Password",
        "newPassword": "New Password",
        "confirmNewPassword": "Confirm New Password",
        "updateProfile": "Update Profile",
        "avatarUrl": "Avatar URL",
        "passwordChangeSuccess": "Password changed successfully!",
        "passwordChangeError": "Error changing password",
        "currentPasswordRequired": "You need to enter your current password correctly to authenticate before changing to a new password"
      },
      
      // Admin
      "admin": {
        "dashboard": "Admin Dashboard",
        "userManagement": "User Management",
        "quizManagement": "Quiz Management",
        "categoryManagement": "Category Management",
        "statistics": "Statistics",
        "settings": "Settings"
      },
      
      // Categories
      "categories": {
        "programming": "Programming",
        "webDevelopment": "Web Development",
        "science": "Science",
        "mathematics": "Mathematics",
        "generalKnowledge": "General Knowledge",
        "history": "History",
        "sports": "Sports",
        "entertainment": "Entertainment"
      },
      
      // Difficulty levels
      "difficulty": {
        "easy": "Easy",
        "medium": "Medium",
        "hard": "Hard"
      },
      
      // Messages
      "messages": {
        "error": "An error occurred",
        "success": "Success",
        "noData": "No data available",
        "networkError": "Network error",
        "unauthorized": "Unauthorized access",
        "notFound": "Not found",
        "serverError": "Server error"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // default language
    fallbackLng: 'vi',
    
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false // React already does escaping
    }
  });

export default i18n;
