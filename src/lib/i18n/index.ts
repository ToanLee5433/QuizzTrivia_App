import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

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
        "upload": "Tải lên",
        "or": "Hoặc",
        "loadingData": "Đang tải dữ liệu...",
        "pleaseWait": "Vui lòng đợi một chút",
        "checkingAuth": "Đang kiểm tra xác thực...",
        "minutes": "phút",
        "seconds": "giây",
        "players": "người chơi",
        "room": "phòng",
        "join": "Tham gia",
        "leave": "Rời khỏi",
        "ready": "Sẵn sàng",
        "waiting": "Đang chờ",
        "start": "Bắt đầu",
        "finish": "Kết thúc",
        "complete": "Hoàn thành",
        "continue": "Tiếp tục",
        "processing": "Đang xử lý...",
        "noData": "Không có dữ liệu",
        "tryAgain": "Vui lòng thử lại",
        "retry": "Thử lại",
        "refresh": "Làm mới",
        "success": "Thành công",
        "error": "Lỗi",
        "warning": "Cảnh báo",
        "info": "Thông tin"
      },
      
      // Navigation
      "nav": {
        "home": "Trang chủ",
        "dashboard": "Bảng điều khiển",
        "quizzes": "Quiz",
        "multiplayer": "Chơi cùng",
        "favorites": "Yêu thích",
        "leaderboard": "Bảng xếp hạng",
        "profile": "Hồ sơ",
        "creator": "Creator",
        "admin": "Quản trị",
        "login": "Đăng nhập",
        "logout": "Đăng xuất",
        "register": "Đăng ký",
        "settings": "Cài đặt"
      },
      
      // Multiplayer
      "multiplayer": {
        "title": "Chơi cùng bạn bè",
        "subtitle": "Tham gia phòng và thi đấu với người khác",
        "createRoom": "Tạo phòng mới",
        "joinRoom": "Tham gia phòng",
        "roomCode": "Mã phòng",
        "roomName": "Tên phòng",
        "maxPlayers": "Số người tối đa",
        "timeLimit": "Thời gian mỗi câu",
        "privacy": "Quyền riêng tư",
        "public": "Công khai",
        "private": "Riêng tư",
        "password": "Mật khẩu",
        "enterPassword": "Nhập mật khẩu",
        "roomSettings": "Cài đặt phòng",
        "gameSettings": "Cài đặt game",
        "showAnswers": "Hiển thị đáp án",
        "allowLateJoin": "Cho phép vào muộn",
        "autoStart": "Tự động bắt đầu",
        "lobby": {
          "title": "Phòng chờ",
          "waitingForHost": "Đang chờ chủ phòng bắt đầu",
          "playersReady": "{{ready}}/{{total}} người sẵn sàng",
          "startGame": "Bắt đầu game",
          "kickPlayer": "Kick người chơi",
          "leaveRoom": "Rời phòng",
          "copyCode": "Sao chép mã phòng",
          "shareCode": "Chia sẻ mã phòng"
        },
        "game": {
          "title": "Game đang diễn ra",
          "question": "Câu hỏi {{current}}/{{total}}",
          "timeLeft": "Còn lại {{time}}s",
          "submitting": "Đang gửi câu trả lời...",
          "waitingForOthers": "Đang chờ người khác...",
          "results": "Kết quả câu hỏi",
          "leaderboard": "Bảng xếp hạng",
          "gameOver": "Game kết thúc",
          "finalResults": "Kết quả cuối cùng"
        },
        "chat": {
          "title": "Chat",
          "placeholder": "Nhập tin nhắn...",
          "send": "Gửi",
          "system": "Hệ thống",
          "playerJoined": "{{name}} đã tham gia",
          "playerLeft": "{{name}} đã rời khỏi",
          "playerKicked": "{{name}} đã bị kick",
          "gameStarted": "Game đã bắt đầu",
          "gameEnded": "Game đã kết thúc"
        },
        "errors": {
          "roomNotFound": "Không tìm thấy phòng",
          "roomFull": "Phòng đã đầy",
          "wrongPassword": "Mật khẩu không đúng",
          "gameInProgress": "Game đang diễn ra",
          "connectionLost": "Mất kết nối",
          "reconnecting": "Đang kết nối lại...",
          "failedToJoin": "Không thể tham gia phòng",
          "failedToCreate": "Không thể tạo phòng"
        },
        "success": {
          "roomCreated": "Tạo phòng thành công",
          "joinedRoom": "Tham gia phòng thành công",
          "leftRoom": "Đã rời khỏi phòng",
          "kickedPlayer": "Đã kick người chơi",
          "gameStarted": "Game đã bắt đầu"
        }
      },
      
      // Landing page
      "landing": {
        "hero": {
          "title": "Thử thách kiến thức của bạn",
          "subtitle": "Khám phá hàng ngàn quiz thú vị, thử thách bản thân và nâng cao kiến thức với Quiz Trivia - nền tảng quiz tương tác hàng đầu!"
        },
        "cta": {
          "primary": "Bắt đầu ngay - Miễn phí!",
          "secondary": "Đã có tài khoản?"
        },
        "features": {
          "diversity": {
            "title": "Đa dạng chủ đề",
            "description": "Khoa học, lịch sử, thể thao, giải trí và nhiều chủ đề hấp dẫn khác"
          },
          "realtime": {
            "title": "Thời gian thực",
            "description": "Thử thách với timer đếm ngược và theo dõi tiến độ realtime"
          },
          "ranking": {
            "title": "Xếp hạng & Thành tích",
            "description": "Theo dõi điểm số, thống kê và so sánh với bạn bè"
          }
        },
        "stats": {
          "quizzes": "Quiz đa dạng",
          "players": "Người chơi",
          "plays": "Lượt chơi",
          "support": "Hỗ trợ"
        },
        "footer": {
          "rights": "Tất cả quyền được bảo lưu."
        }
      },
      
      // Quiz translations
      "quiz": {
        "enterAnswer": "Nhập câu trả lời của bạn...",
        "exploreQuizzes": "Khám phá Quiz",
        "exploreDescription": "Tìm hiểu kiến thức mới qua các quiz thú vị",
        "untitled": "Quiz không tên"
      },
      
      // Auth translations
      "auth": {
        "login": "Đăng nhập",
        "register": "Đăng ký",
        "logout": "Đăng xuất",
        "email": "Email",
        "password": "Mật khẩu",
        "confirmPassword": "Xác nhận mật khẩu",
        "displayName": "Tên hiển thị",
        "emailPlaceholder": "Nhập email của bạn",
        "passwordPlaceholder": "Nhập mật khẩu",
        "displayNamePlaceholder": "Nhập tên hiển thị",
        "welcomeBack": "Chào mừng trở lại!",
        "createNewAccount": "Tạo tài khoản mới",
        "loginSuccess": "Đăng nhập thành công!",
        "registerSuccess": "Đăng ký thành công!",
        "forgotPassword": "Quên mật khẩu?",
        "rememberMe": "Ghi nhớ đăng nhập",
        "loginWithGoogle": "Đăng nhập với Google",
        "registerWithGoogle": "Đăng ký với Google",
        "agreeToTerms": "Tôi đồng ý với các điều khoản và điều kiện",
        "alreadyHaveAccount": "Đã có tài khoản?",
        "dontHaveAccount": "Chưa có tài khoản?",
        "validation": {
          "emailRequired": "Vui lòng nhập email",
          "emailInvalid": "Email không đúng định dạng",
          "passwordRequired": "Vui lòng nhập mật khẩu",
          "displayNameRequired": "Vui lòng nhập tên hiển thị",
          "passwordMismatch": "Mật khẩu xác nhận không khớp",
          "passwordTooShort": "Mật khẩu phải có ít nhất 6 ký tự",
          "termsRequired": "Vui lòng đồng ý với điều khoản sử dụng"
        },
        "errors": {
          "userNotFound": "Email không tồn tại",
          "wrongPassword": "Mật khẩu không đúng",
          "invalidCredential": "Email hoặc mật khẩu không đúng",
          "invalidEmail": "Email không hợp lệ",
          "userDisabled": "Tài khoản đã bị vô hiệu hóa",
          "tooManyRequests": "Quá nhiều lần thử. Vui lòng thử lại sau",
          "loginError": "Lỗi đăng nhập: {{message}}",
          "otpSendError": "Có lỗi xảy ra khi gửi mã xác thực: {{message}}",
          "registrationDataNotFound": "Không tìm thấy thông tin đăng ký",
          "emailAlreadyInUse": "Email này đã được sử dụng",
          "weakPassword": "Mật khẩu quá yếu",
          "registerError": "Lỗi tạo tài khoản: {{message}}",
          "googleLoginError": "Lỗi đăng nhập Google: {{message}}"
        },
        "googleLoginSuccess": "Đăng nhập Google thành công!",
        "registrationCancelled": "Đã hủy quá trình đăng ký",
        "confirmPasswordPlaceholder": "Xác nhận mật khẩu",
        "termsOfService": "điều khoản sử dụng",
        "noAccount": "Chưa có tài khoản? Đăng ký ngay",
        "hasAccount": "Đã có tài khoản? Đăng nhập",
        "loginRequired": "Cần đăng nhập"
      },
      
      // Creator page
      "creator": {
        "loginMessage": "Bạn cần đăng nhập để truy cập trang Creator",
        "roleRequired": "Bạn cần có vai trò Creator hoặc Admin để truy cập trang này"
      },
      
      // Create Quiz
      "createQuiz": {
        "loginRequired": "Bạn cần đăng nhập để tạo quiz",
        "info": {
          "basicInfo": "Thông tin cơ bản",
          "fillInfo": "Điền thông tin cơ bản về quiz của bạn",
          "titleLabel": "Tiêu đề Quiz",
          "titlePlaceholder": "Nhập tiêu đề quiz...",
          "descriptionLabel": "Mô tả",
          "descriptionPlaceholder": "Mô tả chi tiết về quiz..."
        }
      },
      
      // Messages
      "messages": {
        "unauthorized": "Không có quyền truy cập",
        "serverError": "Không thể kết nối đến server. Vui lòng thử lại sau.",
        "retrying": "Đang thử kết nối lại..."
      },
      
      // Errors
      "errors": {
        "firestoreConnection": "Không thể kết nối Firestore"
      },
      
      // Leaderboard
      "leaderboard": {
        "searchPlayers": "🔍 Tìm kiếm người chơi...",
        "collapse": "Thu gọn",
        "viewMore": "Xem thêm {{count}} người"
      },
      
      // Dashboard
      "dashboard": {
        "welcome": "Xin chào, {{name}}!",
        "takeQuizzes": "Thử thách kiến thức với các bài quiz đa dạng",
        "favoriteQuizzes": "Các quiz bạn đã lưu để làm sau",
        "viewRanking": "Xem thứ hạng và thành tích của bạn",
        "editProfile": "Xem và chỉnh sửa thông tin cá nhân",
        "createQuizzes": "Tạo các bài quiz của riêng bạn",
        "adminPanel": "Quản lý người dùng và hệ thống"
      },
      
      // Admin
      "admin": {
        "panel": "Bảng Quản Trị",
        "greeting": "Xin chào, {{name}}",
        "quizApproved": "Đã phê duyệt quiz thành công!",
        "quizApprovalError": "Có lỗi xảy ra khi phê duyệt quiz!",
        "quizRejected": "Đã từ chối quiz!",
        "quizRejectionError": "Có lỗi xảy ra khi từ chối quiz!",
        "dataLoadSuccess": "Đã tải dữ liệu thực tế từ Firebase!",
        "dataLoadError": "Lỗi khi tải dữ liệu",
        "realDataLoadError": "Lỗi khi tải dữ liệu thực tế",
        "exportDataDevelopment": "Chức năng xuất dữ liệu đang được phát triển",
        "currentTab": "Tab hiện tại: {{tab}}",
        "backToOverview": "Về Tổng quan",
        "viewingStatsSection": "Bạn đang xem phần Thống kê & Tổng quan",
        "advancedStatsDescription": "Đây là trang chứa biểu đồ và thống kê nâng cao mà bạn vừa thêm",
        "userManagement": "Quản lý người dùng",
        "tabs": {
          "overview": "Tổng quan",
          "users": "Người dùng", 
          "quizzes": "Quiz",
          "categories": "Danh mục",
          "overviewStats": "Tổng quan & Thống kê",
          "userManagement": "Quản lý Người dùng",
          "quizManagement": "Quản lý Quiz",
          "categoryManagement": "Quản lý Danh mục"
        },
        "stats": {
          "totalUsers": "Tổng tài khoản",
          "publishedQuizzes": "Quiz đã xuất bản",
          "completionAttempts": "Lượt làm bài",
          "totalCreators": "Người sáng tạo",
          "userGrowth": "Tăng trưởng người dùng"
        }
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
        "upload": "Upload",
        "or": "Or",
        "loadingData": "Loading data...",
        "pleaseWait": "Please wait",
        "checkingAuth": "Checking authentication...",
        "minutes": "minutes",
        "seconds": "seconds",
        "players": "players",
        "room": "room",
        "join": "Join",
        "leave": "Leave",
        "ready": "Ready",
        "waiting": "Waiting",
        "start": "Start",
        "finish": "Finish",
        "complete": "Complete",
        "continue": "Continue",
        "processing": "Processing...",
        "noData": "No data",
        "tryAgain": "Please try again",
        "retry": "Retry",
        "refresh": "Refresh",
        "success": "Success",
        "error": "Error",
        "warning": "Warning",
        "info": "Info"
      },
      
      // Navigation
      "nav": {
        "home": "Home",
        "dashboard": "Dashboard",
        "quizzes": "Quizzes",
        "multiplayer": "Multiplayer",
        "favorites": "Favorites",
        "leaderboard": "Leaderboard",
        "profile": "Profile",
        "creator": "Creator",
        "admin": "Admin",
        "login": "Login",
        "logout": "Logout",
        "register": "Register",
        "settings": "Settings"
      },
      
      // Multiplayer
      "multiplayer": {
        "title": "Play with Friends",
        "subtitle": "Join rooms and compete with others",
        "createRoom": "Create New Room",
        "joinRoom": "Join Room",
        "roomCode": "Room Code",
        "roomName": "Room Name",
        "maxPlayers": "Max Players",
        "timeLimit": "Time per Question",
        "privacy": "Privacy",
        "public": "Public",
        "private": "Private",
        "password": "Password",
        "enterPassword": "Enter Password",
        "roomSettings": "Room Settings",
        "gameSettings": "Game Settings",
        "showAnswers": "Show Answers",
        "allowLateJoin": "Allow Late Join",
        "autoStart": "Auto Start",
        "lobby": {
          "title": "Game Lobby",
          "waitingForHost": "Waiting for host to start",
          "playersReady": "{{ready}}/{{total}} ready",
          "startGame": "Start Game",
          "kickPlayer": "Kick Player",
          "leaveRoom": "Leave Room",
          "copyCode": "Copy Room Code",
          "shareCode": "Share Room Code"
        },
        "game": {
          "title": "Game in Progress",
          "question": "Question {{current}}/{{total}}",
          "timeLeft": "{{time}}s left",
          "submitting": "Submitting answer...",
          "waitingForOthers": "Waiting for others...",
          "results": "Question Results",
          "leaderboard": "Leaderboard",
          "gameOver": "Game Over",
          "finalResults": "Final Results"
        },
        "chat": {
          "title": "Chat",
          "placeholder": "Type a message...",
          "send": "Send",
          "system": "System",
          "playerJoined": "{{name}} joined",
          "playerLeft": "{{name}} left",
          "playerKicked": "{{name}} was kicked",
          "gameStarted": "Game started",
          "gameEnded": "Game ended"
        },
        "errors": {
          "roomNotFound": "Room not found",
          "roomFull": "Room is full",
          "wrongPassword": "Wrong password",
          "gameInProgress": "Game in progress",
          "connectionLost": "Connection lost",
          "reconnecting": "Reconnecting...",
          "failedToJoin": "Failed to join room",
          "failedToCreate": "Failed to create room"
        },
        "success": {
          "roomCreated": "Room created successfully",
          "joinedRoom": "Joined room successfully",
          "leftRoom": "Left room",
          "kickedPlayer": "Player kicked",
          "gameStarted": "Game started"
        }
      },
      
      // Landing page
      "landing": {
        "hero": {
          "title": "Challenge Your Knowledge",
          "subtitle": "Discover thousands of exciting quizzes, challenge yourself and enhance your knowledge with Quiz Trivia - the leading interactive quiz platform!"
        },
        "cta": {
          "primary": "Get Started - Free!",
          "secondary": "Already have an account?"
        },
        "features": {
          "diversity": {
            "title": "Diverse Topics",
            "description": "Science, history, sports, entertainment and many other exciting topics"
          },
          "realtime": {
            "title": "Real-time",
            "description": "Challenge with countdown timer and realtime progress tracking"
          },
          "ranking": {
            "title": "Ranking & Achievements",
            "description": "Track scores, statistics and compare with friends"
          }
        },
        "stats": {
          "quizzes": "Diverse Quizzes",
          "players": "Players",
          "plays": "Plays",
          "support": "Support"
        },
        "footer": {
          "rights": "All rights reserved."
        }
      },
      
      // Quiz translations
      "quiz": {
        "enterAnswer": "Enter your answer...",
        "exploreQuizzes": "Explore Quizzes",
        "exploreDescription": "Learn new knowledge through interesting quizzes",
        "untitled": "Untitled Quiz"
      },
      
      // Auth translations
      "auth": {
        "login": "Login",
        "register": "Register",
        "logout": "Logout",
        "email": "Email",
        "password": "Password",
        "confirmPassword": "Confirm Password",
        "displayName": "Display Name",
        "emailPlaceholder": "Enter your email",
        "passwordPlaceholder": "Enter your password",
        "displayNamePlaceholder": "Enter your display name",
        "welcomeBack": "Welcome back!",
        "createNewAccount": "Create new account",
        "loginSuccess": "Login successful!",
        "registerSuccess": "Registration successful!",
        "forgotPassword": "Forgot password?",
        "rememberMe": "Remember me",
        "loginWithGoogle": "Login with Google",
        "registerWithGoogle": "Register with Google",
        "agreeToTerms": "I agree to the terms and conditions",
        "alreadyHaveAccount": "Already have an account?",
        "dontHaveAccount": "Don't have an account?",
        "validation": {
          "emailRequired": "Please enter email",
          "emailInvalid": "Email format is invalid",
          "passwordRequired": "Please enter password",
          "displayNameRequired": "Please enter display name",
          "passwordMismatch": "Password confirmation does not match",
          "passwordTooShort": "Password must be at least 6 characters",
          "termsRequired": "Please agree to the terms of service"
        },
        "errors": {
          "userNotFound": "Email not found",
          "wrongPassword": "Wrong password",
          "invalidCredential": "Invalid email or password",
          "invalidEmail": "Invalid email",
          "userDisabled": "Account has been disabled",
          "tooManyRequests": "Too many attempts. Please try again later",
          "loginError": "Login error: {{message}}",
          "otpSendError": "Error sending verification code: {{message}}",
          "registrationDataNotFound": "Registration data not found",
          "emailAlreadyInUse": "This email is already in use",
          "weakPassword": "Password is too weak",
          "registerError": "Registration error: {{message}}",
          "googleLoginError": "Google login error: {{message}}"
        },
        "googleLoginSuccess": "Google login successful!",
        "registrationCancelled": "Registration cancelled",
        "confirmPasswordPlaceholder": "Confirm password",
        "termsOfService": "terms of service",
        "noAccount": "Don't have an account? Sign up now",
        "hasAccount": "Already have an account? Sign in",
        "loginRequired": "Login required"
      },
      
      // Creator page
      "creator": {
        "loginMessage": "You need to login to access Creator page",
        "roleRequired": "You need Creator or Admin role to access this page"
      },
      
      // Create Quiz
      "createQuiz": {
        "loginRequired": "You need to login to create quiz",
        "info": {
          "basicInfo": "Basic Information",
          "fillInfo": "Fill in basic information about your quiz",
          "titleLabel": "Quiz Title",
          "titlePlaceholder": "Enter quiz title...",
          "descriptionLabel": "Description",
          "descriptionPlaceholder": "Detailed description about the quiz..."
        }
      },
      
      // Messages
      "messages": {
        "unauthorized": "Unauthorized access",
        "serverError": "Cannot connect to server. Please try again later.",
        "retrying": "Retrying connection..."
      },
      
      // Errors
      "errors": {
        "firestoreConnection": "Cannot connect to Firestore"
      },
      
      // Leaderboard
      "leaderboard": {
        "searchPlayers": "🔍 Search players...",
        "collapse": "Collapse",
        "viewMore": "View {{count}} more players"
      },
      
      // Dashboard
      "dashboard": {
        "welcome": "Hello, {{name}}!",
        "takeQuizzes": "Challenge your knowledge with diverse quizzes",
        "favoriteQuizzes": "Quizzes you've saved for later",
        "viewRanking": "View your ranking and achievements",
        "editProfile": "View and edit your personal information",
        "createQuizzes": "Create your own quizzes",
        "adminPanel": "Manage users and system"
      },
      
      // Admin
      "admin": {
        "panel": "Admin Panel",
        "greeting": "Hello, {{name}}",
        "quizApproved": "Quiz approved successfully!",
        "quizApprovalError": "Error occurred while approving quiz!",
        "quizRejected": "Quiz rejected!",
        "quizRejectionError": "Error occurred while rejecting quiz!",
        "dataLoadSuccess": "Successfully loaded real data from Firebase!",
        "dataLoadError": "Error loading data",
        "realDataLoadError": "Error loading real data",
        "exportDataDevelopment": "Data export feature is under development",
        "currentTab": "Current tab: {{tab}}",
        "backToOverview": "Back to Overview",
        "viewingStatsSection": "You are viewing the Statistics & Overview section",
        "advancedStatsDescription": "This page contains the advanced charts and statistics you just added",
        "userManagement": "User Management",
        "tabs": {
          "overview": "Overview",
          "users": "Users",
          "quizzes": "Quizzes",
          "categories": "Categories",
          "overviewStats": "Overview & Statistics",
          "userManagement": "User Management",
          "quizManagement": "Quiz Management",
          "categoryManagement": "Category Management"
        },
        "stats": {
          "totalUsers": "Total Accounts",
          "publishedQuizzes": "Published Quizzes",
          "completionAttempts": "Quiz Attempts",
          "totalCreators": "Content Creators",
          "userGrowth": "User Growth"
        }
      }
    }
  }
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // default language
    fallbackLng: 'vi',
    // Use both filesystem namespace (common) and inline fallback (translation)
    ns: ['common', 'translation'],
    defaultNS: 'common',
    fallbackNS: 'translation',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false // React already does escaping
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/{{lng}}/{{ns}}.json'
    },

    // Performance optimizations
    load: 'languageOnly',
    preload: ['vi', 'en'],
    
    // Debug mode in development (Vite)
    debug: import.meta.env.DEV,

    // Avoid Suspense requirement globally since not all trees are wrapped
    react: { useSuspense: false },

    // Optionally record missing keys while developing
    saveMissing: import.meta.env.DEV
  });

// Helpful development logs for i18n lifecycle
if (import.meta.env.DEV) {
  i18n.on('initialized', (opts) => {
    // eslint-disable-next-line no-console
    console.log('i18n initialized', { lng: i18n.language, opts });
  });
  i18n.on('loaded', (loaded) => {
    // eslint-disable-next-line no-console
    console.log('i18n resources loaded', loaded);
  });
  i18n.on('languageChanged', (lng) => {
    // eslint-disable-next-line no-console
    console.log('i18n language changed to', lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  });
}

// Cache buster: 1755022794404
// Force reload: 1755023227283
export default i18n;
