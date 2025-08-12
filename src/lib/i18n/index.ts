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
