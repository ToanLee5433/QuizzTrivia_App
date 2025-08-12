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
        "enterAnswer": "Nhập câu trả lời của bạn..."
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
        "errors": {
          "userNotFound": "Email không tồn tại",
          "wrongPassword": "Mật khẩu không đúng",
          "invalidCredential": "Email hoặc mật khẩu không đúng",
          "invalidEmail": "Email không hợp lệ",
          "userDisabled": "Tài khoản đã bị vô hiệu hóa",
          "tooManyRequests": "Quá nhiều lần thử. Vui lòng thử lại sau",
          "loginError": "Lỗi đăng nhập: {{message}}"
        },
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
        "unauthorized": "Không có quyền truy cập"
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
        "enterAnswer": "Enter your answer..."
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
        "errors": {
          "userNotFound": "Email not found",
          "wrongPassword": "Wrong password",
          "invalidCredential": "Invalid email or password",
          "invalidEmail": "Invalid email",
          "userDisabled": "Account has been disabled",
          "tooManyRequests": "Too many attempts. Please try again later",
          "loginError": "Login error: {{message}}"
        },
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
        "unauthorized": "Unauthorized access"
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
    
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development'
  });

export default i18n;
