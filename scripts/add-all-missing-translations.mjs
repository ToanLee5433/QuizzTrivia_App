#!/usr/bin/env node

/**
 * 🔧 Add ALL missing translation keys với bản dịch đầy đủ
 * Includes: common, auth, quiz, categories, multiplayer, profile, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const LOCALES_DIR = path.join(rootDir, 'public', 'locales');

// Comprehensive translations for ALL missing keys
const allTranslations = {
  vi: {
    // Common
    common: {
      selectLanguage: "Chọn ngôn ngữ",
      back: "Quay lại",
      createdAt: "Ngày tạo",
      actions: "Hành động",
      cancel: "Hủy",
      points: "Điểm",
      correct: "Đúng",
      loading: "Đang tải...",
      you: "Bạn",
      online: "Trực tuyến",
      offline: "Ngoại tuyến",
      start: "Bắt đầu",
      messages: "Tin nhắn",
      submit: "Gửi",
      rank: "Xếp hạng",
      accuracy: "Độ chính xác",
      avgTime: "Thời gian TB",
      recommended: "Đề xuất",
      connecting: "Đang kết nối...",
      all: "Tất cả"
    },

    // Auth
    auth: {
      logout: "Đăng xuất",
      validation: {
        emailRequired: "Email là bắt buộc",
        emailInvalid: "Email không hợp lệ",
        passwordRequired: "Mật khẩu là bắt buộc",
        displayNameRequired: "Tên hiển thị là bắt buộc",
        passwordMismatch: "Mật khẩu không khớp",
        passwordTooShort: "Mật khẩu quá ngắn (tối thiểu 6 ký tự)",
        termsRequired: "Bạn phải đồng ý với điều khoản"
      },
      errors: {
        emailAlreadyInUse: "Email đã được sử dụng",
        weakPassword: "Mật khẩu quá yếu",
        registerError: "Lỗi đăng ký",
        googleLoginError: "Lỗi đăng nhập Google",
        loginError: "Lỗi đăng nhập"
      }
    },

    // Quiz
    quiz: {
      reviews: {
        reviewQuiz: "Đánh giá Quiz"
      },
      questionsCount: "câu hỏi",
      timeLimit: "Thời gian",
      ratingCount: "đánh giá",
      type: "Loại",
      points: "Điểm",
      moreQuestions: "Thêm câu hỏi",
      stats: {
        totalQuizzes: "Tổng số Quiz",
        totalViews: "Tổng lượt xem",
        totalAttempts: "Tổng lượt thử",
        views: "Lượt xem",
        attempts: "Lượt thử",
        completions: "Hoàn thành"
      },
      boolean: {
        true: "Đúng"
      },
      enterAnswer: "Nhập câu trả lời",
      unsupportedType: "Loại câu hỏi không được hỗ trợ",
      questionTypes: {
        image: "Hình ảnh",
        checkbox: "Nhiều lựa chọn"
      },
      selectedQuiz: "Quiz đã chọn",
      untitled: "Chưa đặt tên",
      deleteError: "Lỗi khi xóa",
      confirmDelete: "Xác nhận xóa?",
      explanation: "Giải thích"
    },

    // Quiz List
    quizList: {
      exploreQuizzes: "Khám phá Quiz",
      title: "Danh sách Quiz",
      results: {
        quizzes: "quiz"
      },
      empty: {
        noQuizFound: "Không tìm thấy quiz nào",
        clearFilters: "Xóa bộ lọc"
      },
      filters: {
        allCategories: "Tất cả chủ đề",
        allDifficulties: "Tất cả độ khó"
      },
      sort: {
        newest: "Mới nhất",
        oldest: "Cũ nhất",
        difficulty: "Độ khó"
      },
      options: {
        showCompleted: "Hiện quiz đã hoàn thành"
      }
    },

    // Categories
    categories: {
      colors: {
        blue: "Xanh dương",
        green: "Xanh lá",
        purple: "Tím",
        red: "Đỏ",
        yellow: "Vàng",
        pink: "Hồng",
        indigo: "Chàm",
        gray: "Xám"
      },
      loadError: "Lỗi tải chủ đề",
      enterName: "Nhập tên chủ đề",
      updateSuccess: "Cập nhật chủ đề thành công",
      addSuccess: "Thêm chủ đề thành công",
      saveError: "Lỗi lưu chủ đề",
      confirmDeleteName: "Xác nhận xóa chủ đề",
      deleteSuccess: "Xóa chủ đề thành công",
      deleteError: "Lỗi xóa chủ đề",
      add: "Thêm chủ đề",
      total: "Tổng",
      withQuizzes: "có quiz",
      totalQuizzes: "Tổng số quiz",
      empty: "Trống",
      searchPlaceholder: "Tìm kiếm chủ đề...",
      noCategories: "Không có chủ đề nào",
      noSearchMatch: "Không tìm thấy kết quả",
      noneCreated: "Chưa tạo chủ đề nào",
      createFirst: "Tạo chủ đề đầu tiên",
      quizSuffix: "quiz",
      createdAtLabel: "Ngày tạo",
      editTitle: "Chỉnh sửa chủ đề",
      addTitle: "Thêm chủ đề mới",
      name: "Tên chủ đề",
      namePlaceholder: "Nhập tên chủ đề",
      description: "Mô tả",
      descriptionPlaceholder: "Nhập mô tả",
      color: "Màu sắc",
      create: "Tạo",
      quizCount: "Số quiz",
      confirmDelete: "Xác nhận xóa chủ đề này?"
    },

    // Multiplayer
    multiplayer: {
      avgScore: "Điểm TB",
      startingIn: "Bắt đầu sau",
      totalPlayers: "Tổng người chơi",
      readyPlayers: "Người chơi sẵn sàng",
      timePerQuestion: "Thời gian mỗi câu",
      waitingForPlayer: "Đang đợi người chơi...",
      errors: {
        connectionFailed: "Kết nối thất bại",
        connectionLost: "Mất kết nối",
        reconnecting: "Đang kết nối lại...",
        createRoomFailed: "Tạo phòng thất bại",
        joinRoomFailed: "Tham gia phòng thất bại"
      },
      success: {
        gameStarted: "Trò chơi đã bắt đầu",
        connectionRestored: "Đã khôi phục kết nối",
        roomCreated: "Đã tạo phòng",
        joinedRoom: "Đã tham gia phòng",
        leftRoom: "Đã rời phòng"
      },
      chat: {
        title: "Trò chuyện",
        noMessages: "Chưa có tin nhắn",
        disabled: "Chat bị tắt",
        placeholder: "Nhập tin nhắn..."
      },
      enterRoomCode: "Nhập mã phòng",
      roomCodeHint: "Mã phòng 6 ký tự",
      password: "Mật khẩu",
      enterPassword: "Nhập mật khẩu",
      passwordRequired: "Yêu cầu mật khẩu",
      game: {
        gameOver: "Trò chơi kết thúc",
        finalResults: "Kết quả cuối cùng"
      },
      yourResult: "Kết quả của bạn",
      totalQuestions: "Tổng số câu",
      totalTime: "Tổng thời gian",
      playAgain: "Chơi lại",
      backToLobby: "Quay lại sảnh",
      subtitle: "Chơi cùng bạn bè",
      roomName: "Tên phòng",
      enterRoomName: "Nhập tên phòng",
      maxPlayers: "Số người tối đa",
      timeLimit: "Giới hạn thời gian",
      roomSettings: "Cài đặt phòng",
      showLeaderboard: "Hiện bảng xếp hạng",
      private: "Riêng tư"
    },

    // Game Mode
    gameMode: {
      singlePlayer: "Chơi đơn",
      singlePlayerDesc: "Chơi một mình",
      noPressure: "Không áp lực",
      trackProgress: "Theo dõi tiến độ",
      customizable: "Tùy chỉnh",
      startSolo: "Bắt đầu chơi đơn",
      multiplayer: "Nhiều người chơi",
      multiplayerDesc: "Chơi với bạn bè",
      createRoom: "Tạo phòng",
      createRoomDesc: "Tạo phòng riêng",
      becomeHost: "Trở thành chủ phòng",
      invitePlayers: "Mời người chơi",
      customizeSettings: "Tùy chỉnh cài đặt"
    },

    // Profile
    profile: {
      viewAllCount: "Xem tất cả",
      passwordMinLength: "Mật khẩu tối thiểu 6 ký tự",
      displayName: "Tên hiển thị"
    },

    // Dashboard
    dashboard: {
      welcome: "Chào mừng"
    },

    // Not Found
    notFound: {
      title: "Không tìm thấy trang",
      description: "Trang bạn đang tìm kiếm không tồn tại",
      backToHome: "Quay lại trang chủ"
    },

    // Unauthorized
    unauthorized: {
      title: "Không có quyền truy cập",
      description: "Bạn không có quyền truy cập trang này",
      goHome: "Về trang chủ"
    },

    // Landing
    landing: {
      features: {
        diversity: {
          title: "Đa dạng chủ đề",
          description: "Hàng nghìn quiz từ nhiều lĩnh vực khác nhau"
        },
        realtime: {
          description: "Cập nhật kết quả theo thời gian thực"
        },
        ranking: {
          description: "Bảng xếp hạng toàn cầu"
        }
      }
    },

    // Leaderboard
    leaderboard: {
      viewAllCount: "Xem tất cả"
    },

    // Status
    status: {
      label: "Trạng thái"
    },

    // Nav
    nav: {
      quiz: "Quiz"
    },

    // Achievement
    achievement: {
      unlockedAt: "Mở khóa lúc",
      unlocked: "Đã mở khóa"
    },

    // Errors
    errors: {
      unauthorized: "Không có quyền truy cập"
    },

    // UI
    ui: {
      role: "Vai trò"
    },

    // Action
    action: {
      actions: "Hành động",
      action: "Hành động"
    },

    // Users
    users: {
      confirmDelete: "Xác nhận xóa người dùng?"
    }
  },

  en: {
    // Common
    common: {
      selectLanguage: "Select Language",
      back: "Back",
      createdAt: "Created At",
      actions: "Actions",
      cancel: "Cancel",
      points: "Points",
      correct: "Correct",
      loading: "Loading...",
      you: "You",
      online: "Online",
      offline: "Offline",
      start: "Start",
      messages: "Messages",
      submit: "Submit",
      rank: "Rank",
      accuracy: "Accuracy",
      avgTime: "Avg Time",
      recommended: "Recommended",
      connecting: "Connecting...",
      all: "All"
    },

    // Auth
    auth: {
      logout: "Logout",
      validation: {
        emailRequired: "Email is required",
        emailInvalid: "Invalid email",
        passwordRequired: "Password is required",
        displayNameRequired: "Display name is required",
        passwordMismatch: "Passwords don't match",
        passwordTooShort: "Password too short (min 6 characters)",
        termsRequired: "You must agree to terms"
      },
      errors: {
        emailAlreadyInUse: "Email already in use",
        weakPassword: "Weak password",
        registerError: "Registration error",
        googleLoginError: "Google login error",
        loginError: "Login error"
      }
    },

    // Quiz
    quiz: {
      reviews: {
        reviewQuiz: "Review Quiz"
      },
      questionsCount: "questions",
      timeLimit: "Time Limit",
      ratingCount: "ratings",
      type: "Type",
      points: "Points",
      moreQuestions: "More Questions",
      stats: {
        totalQuizzes: "Total Quizzes",
        totalViews: "Total Views",
        totalAttempts: "Total Attempts",
        views: "Views",
        attempts: "Attempts",
        completions: "Completions"
      },
      boolean: {
        true: "True"
      },
      enterAnswer: "Enter answer",
      unsupportedType: "Unsupported question type",
      questionTypes: {
        image: "Image",
        checkbox: "Multiple Choice"
      },
      selectedQuiz: "Selected Quiz",
      untitled: "Untitled",
      deleteError: "Delete error",
      confirmDelete: "Confirm delete?",
      explanation: "Explanation"
    },

    // Quiz List
    quizList: {
      exploreQuizzes: "Explore Quizzes",
      title: "Quiz List",
      results: {
        quizzes: "quizzes"
      },
      empty: {
        noQuizFound: "No quiz found",
        clearFilters: "Clear filters"
      },
      filters: {
        allCategories: "All Categories",
        allDifficulties: "All Difficulties"
      },
      sort: {
        newest: "Newest",
        oldest: "Oldest",
        difficulty: "Difficulty"
      },
      options: {
        showCompleted: "Show completed"
      }
    },

    // Categories
    categories: {
      colors: {
        blue: "Blue",
        green: "Green",
        purple: "Purple",
        red: "Red",
        yellow: "Yellow",
        pink: "Pink",
        indigo: "Indigo",
        gray: "Gray"
      },
      loadError: "Load error",
      enterName: "Enter name",
      updateSuccess: "Update successful",
      addSuccess: "Add successful",
      saveError: "Save error",
      confirmDeleteName: "Confirm delete",
      deleteSuccess: "Delete successful",
      deleteError: "Delete error",
      add: "Add Category",
      total: "Total",
      withQuizzes: "with quizzes",
      totalQuizzes: "Total Quizzes",
      empty: "Empty",
      searchPlaceholder: "Search categories...",
      noCategories: "No categories",
      noSearchMatch: "No matches found",
      noneCreated: "No categories created",
      createFirst: "Create first category",
      quizSuffix: "quizzes",
      createdAtLabel: "Created",
      editTitle: "Edit Category",
      addTitle: "Add Category",
      name: "Name",
      namePlaceholder: "Enter name",
      description: "Description",
      descriptionPlaceholder: "Enter description",
      color: "Color",
      create: "Create",
      quizCount: "Quiz Count",
      confirmDelete: "Confirm delete this category?"
    },

    // Multiplayer
    multiplayer: {
      avgScore: "Avg Score",
      startingIn: "Starting in",
      totalPlayers: "Total Players",
      readyPlayers: "Ready Players",
      timePerQuestion: "Time per Question",
      waitingForPlayer: "Waiting for players...",
      errors: {
        connectionFailed: "Connection failed",
        connectionLost: "Connection lost",
        reconnecting: "Reconnecting...",
        createRoomFailed: "Create room failed",
        joinRoomFailed: "Join room failed"
      },
      success: {
        gameStarted: "Game started",
        connectionRestored: "Connection restored",
        roomCreated: "Room created",
        joinedRoom: "Joined room",
        leftRoom: "Left room"
      },
      chat: {
        title: "Chat",
        noMessages: "No messages",
        disabled: "Chat disabled",
        placeholder: "Type message..."
      },
      enterRoomCode: "Enter room code",
      roomCodeHint: "6-digit room code",
      password: "Password",
      enterPassword: "Enter password",
      passwordRequired: "Password required",
      game: {
        gameOver: "Game Over",
        finalResults: "Final Results"
      },
      yourResult: "Your Result",
      totalQuestions: "Total Questions",
      totalTime: "Total Time",
      playAgain: "Play Again",
      backToLobby: "Back to Lobby",
      subtitle: "Play with friends",
      roomName: "Room Name",
      enterRoomName: "Enter room name",
      maxPlayers: "Max Players",
      timeLimit: "Time Limit",
      roomSettings: "Room Settings",
      showLeaderboard: "Show Leaderboard",
      private: "Private"
    },

    // Game Mode
    gameMode: {
      singlePlayer: "Single Player",
      singlePlayerDesc: "Play alone",
      noPressure: "No Pressure",
      trackProgress: "Track Progress",
      customizable: "Customizable",
      startSolo: "Start Solo",
      multiplayer: "Multiplayer",
      multiplayerDesc: "Play with friends",
      createRoom: "Create Room",
      createRoomDesc: "Create private room",
      becomeHost: "Become Host",
      invitePlayers: "Invite Players",
      customizeSettings: "Customize Settings"
    },

    // Profile
    profile: {
      viewAllCount: "View All",
      passwordMinLength: "Password min 6 characters",
      displayName: "Display Name"
    },

    // Dashboard
    dashboard: {
      welcome: "Welcome"
    },

    // Not Found
    notFound: {
      title: "Page Not Found",
      description: "The page you're looking for doesn't exist",
      backToHome: "Back to Home"
    },

    // Unauthorized
    unauthorized: {
      title: "Unauthorized",
      description: "You don't have permission to access this page",
      goHome: "Go Home"
    },

    // Landing
    landing: {
      features: {
        diversity: {
          title: "Diverse Topics",
          description: "Thousands of quizzes from various fields"
        },
        realtime: {
          description: "Real-time result updates"
        },
        ranking: {
          description: "Global leaderboard"
        }
      }
    },

    // Leaderboard
    leaderboard: {
      viewAllCount: "View All"
    },

    // Status
    status: {
      label: "Status"
    },

    // Nav
    nav: {
      quiz: "Quiz"
    },

    // Achievement
    achievement: {
      unlockedAt: "Unlocked at",
      unlocked: "Unlocked"
    },

    // Errors
    errors: {
      unauthorized: "Unauthorized"
    },

    // UI
    ui: {
      role: "Role"
    },

    // Action
    action: {
      actions: "Actions",
      action: "Action"
    },

    // Users
    users: {
      confirmDelete: "Confirm delete user?"
    }
  }
};

console.log('🔧 Adding ALL missing translations...\n');

// Load current translations
const viPath = path.join(LOCALES_DIR, 'vi', 'common.json');
const enPath = path.join(LOCALES_DIR, 'en', 'common.json');

let viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
let enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Deep merge function with conflict resolution
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // If target[key] exists but is not an object, override it
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      // Only set if key doesn't exist
      if (!target[key]) {
        target[key] = source[key];
      }
    }
  }
  return target;
}

// Merge all translations
viData = deepMerge(viData, allTranslations.vi);
enData = deepMerge(enData, allTranslations.en);

// Write back
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2) + '\n', 'utf8');

console.log('✅ All missing translations added!\n');
console.log('📊 Summary:');
console.log('   - Added translations for: common, auth, quiz, categories,');
console.log('     multiplayer, profile, dashboard, notFound, unauthorized,');
console.log('     landing, leaderboard, status, nav, achievement, etc.\n');
console.log('🔄 Run npm run i18n:validate to check\n');
