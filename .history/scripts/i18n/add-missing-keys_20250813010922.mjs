#!/usr/bin/env node

import fs from 'fs-extra';

// Missing keys to add
const missingKeys = {
  vi: {
    "common": {
      "accuracy": "Độ chính xác",
      "avgTime": "Thời gian trung bình",
      "back": "Quay lại", 
      "cancel": "Hủy",
      "checkingAuth": "Đang kiểm tra đăng nhập...",
      "connecting": "Đang kết nối...",
      "correct": "Đúng",
      "guide": "Hướng dẫn",
      "loading": "Đang tải...",
      "loadingData": "Đang tải dữ liệu...",
      "messages": "tin nhắn",
      "minutes": "phút",
      "offline": "Ngoại tuyến",
      "online": "Trực tuyến",
      "or": "hoặc",
      "pleaseWait": "Vui lòng chờ...",
      "points": "điểm",
      "rank": "Xếp hạng",
      "recommended": "Khuyến nghị",
      "start": "Bắt đầu",
      "submit": "Xác nhận",
      "tryAgain": "Thử lại",
      "you": "Bạn"
    },
    "admin": {
      "advancedStatsDescription": "Thống kê chi tiết về hoạt động của hệ thống",
      "backToOverview": "Quay lại tổng quan",
      "currentTab": "Tab hiện tại",
      "dataLoadSuccess": "Tải dữ liệu thành công",
      "exportDataDevelopment": "Xuất dữ liệu phát triển",
      "greeting": "Chào mừng đến trang quản trị",
      "quizApprovalError": "Lỗi khi duyệt quiz",
      "quizApproved": "Quiz đã được duyệt",
      "quizRejected": "Quiz đã bị từ chối",
      "quizRejectionError": "Lỗi khi từ chối quiz",
      "viewingStatsSection": "Đang xem phần thống kê",
      "stats": {
        "completionAttempts": "Lượt hoàn thành",
        "publishedQuizzes": "Quiz đã xuất bản",
        "totalCreators": "Tổng số creator",
        "totalUsers": "Tổng số người dùng",
        "userGrowth": "Tăng trưởng người dùng"
      },
      "tabs": {
        "categories": "Danh mục",
        "categoryManagement": "Quản lý danh mục",
        "overview": "Tổng quan",
        "overviewStats": "Thống kê tổng quan",
        "quizManagement": "Quản lý quiz",
        "quizzes": "Quiz",
        "userManagement": "Quản lý người dùng",
        "users": "Người dùng"
      }
    },
    "auth": {
      "logout": "Đăng xuất",
      "registrationCancelled": "Đăng ký đã bị hủy",
      "errors": {
        "emailAlreadyInUse": "Email đã được sử dụng",
        "otpSendError": "Lỗi gửi mã OTP",
        "registerError": "Lỗi đăng ký", 
        "registrationDataNotFound": "Không tìm thấy dữ liệu đăng ký",
        "weakPassword": "Mật khẩu quá yếu"
      },
      "validation": {
        "displayNameRequired": "Tên hiển thị là bắt buộc",
        "emailInvalid": "Email không hợp lệ",
        "emailRequired": "Email là bắt buộc",
        "passwordMismatch": "Mật khẩu không khớp",
        "passwordRequired": "Mật khẩu là bắt buộc",
        "passwordTooShort": "Mật khẩu quá ngắn",
        "termsRequired": "Bạn phải đồng ý với điều khoản"
      }
    },
    "quiz": {
      "enterAnswer": "Nhập câu trả lời",
      "exploreDescription": "Khám phá các quiz thú vị",
      "exploreQuizzes": "Khám phá Quiz",
      "selectedQuiz": "Quiz đã chọn",
      "untitled": "Chưa có tiêu đề"
    },
    "leaderboard": {
      "collapse": "Thu gọn",
      "searchPlayers": "Tìm kiếm người chơi",
      "viewMore": "Xem thêm"
    },
    "landing": {
      "features": {
        "diversity": {
          "title": "Đa dạng chủ đề",
          "description": "Hàng nghìn quiz về mọi lĩnh vực"
        },
        "ranking": {
          "description": "Thi đấu và so tài với bạn bè"
        },
        "realtime": {
          "description": "Trải nghiệm chơi thời gian thực"
        }
      }
    },
    "errors": {
      "firestoreConnection": "Lỗi kết nối Firestore"
    },
    "messages": {
      "retrying": "Đang thử lại..."
    },
    "connected": "Đã kết nối",
    "disconnected": "Mất kết nối"
  },
  en: {
    "common": {
      "accuracy": "Accuracy",
      "avgTime": "Average Time",
      "back": "Back",
      "cancel": "Cancel", 
      "checkingAuth": "Checking authentication...",
      "connecting": "Connecting...",
      "correct": "Correct",
      "guide": "Guide",
      "loading": "Loading...",
      "loadingData": "Loading data...",
      "messages": "messages",
      "minutes": "minutes",
      "offline": "Offline",
      "online": "Online",
      "or": "or",
      "pleaseWait": "Please wait...",
      "points": "points",
      "rank": "Rank",
      "recommended": "Recommended",
      "start": "Start",
      "submit": "Submit",
      "tryAgain": "Try Again",
      "you": "You"
    },
    "admin": {
      "advancedStatsDescription": "Advanced statistics about system activity",
      "backToOverview": "Back to Overview",
      "currentTab": "Current Tab",
      "dataLoadSuccess": "Data loaded successfully",
      "exportDataDevelopment": "Export Development Data",
      "greeting": "Welcome to Admin Panel",
      "quizApprovalError": "Error approving quiz",
      "quizApproved": "Quiz approved",
      "quizRejected": "Quiz rejected",
      "quizRejectionError": "Error rejecting quiz",
      "viewingStatsSection": "Viewing stats section",
      "stats": {
        "completionAttempts": "Completion Attempts",
        "publishedQuizzes": "Published Quizzes",
        "totalCreators": "Total Creators",
        "totalUsers": "Total Users",
        "userGrowth": "User Growth"
      },
      "tabs": {
        "categories": "Categories",
        "categoryManagement": "Category Management",
        "overview": "Overview",
        "overviewStats": "Overview Stats",
        "quizManagement": "Quiz Management",
        "quizzes": "Quizzes",
        "userManagement": "User Management",
        "users": "Users"
      }
    },
    "auth": {
      "logout": "Logout",
      "registrationCancelled": "Registration cancelled",
      "errors": {
        "emailAlreadyInUse": "Email already in use",
        "otpSendError": "OTP send error",
        "registerError": "Registration error",
        "registrationDataNotFound": "Registration data not found",
        "weakPassword": "Password too weak"
      },
      "validation": {
        "displayNameRequired": "Display name is required",
        "emailInvalid": "Email is invalid",
        "emailRequired": "Email is required",
        "passwordMismatch": "Passwords don't match",
        "passwordRequired": "Password is required",
        "passwordTooShort": "Password too short",
        "termsRequired": "You must agree to terms"
      }
    },
    "quiz": {
      "enterAnswer": "Enter answer",
      "exploreDescription": "Explore interesting quizzes",
      "exploreQuizzes": "Explore Quizzes",
      "selectedQuiz": "Selected Quiz",
      "untitled": "Untitled"
    },
    "leaderboard": {
      "collapse": "Collapse",
      "searchPlayers": "Search Players",
      "viewMore": "View More"
    },
    "landing": {
      "features": {
        "diversity": {
          "title": "Diverse Topics",
          "description": "Thousands of quizzes across all fields"
        },
        "ranking": {
          "description": "Compete and challenge friends"
        },
        "realtime": {
          "description": "Real-time gaming experience"
        }
      }
    },
    "errors": {
      "firestoreConnection": "Firestore connection error"
    },
    "messages": {
      "retrying": "Retrying..."
    },
    "connected": "Connected",
    "disconnected": "Disconnected"
  }
};

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

async function addMissingKeys() {
  console.log('🔧 Adding missing i18n keys...');
  
  // Process Vietnamese
  console.log('📝 Processing Vietnamese locale...');
  const viPath = './public/locales/vi/common.json';
  const viData = await fs.readJSON(viPath);
  const viMerged = deepMerge(viData, missingKeys.vi);
  await fs.writeJSON(viPath, viMerged, { spaces: 2 });
  
  // Process English
  console.log('📝 Processing English locale...');
  const enPath = './public/locales/en/common.json';
  const enData = await fs.readJSON(enPath);
  const enMerged = deepMerge(enData, missingKeys.en);
  await fs.writeJSON(enPath, enMerged, { spaces: 2 });
  
  console.log('✅ Missing keys added successfully!');
}

addMissingKeys().catch(console.error);
