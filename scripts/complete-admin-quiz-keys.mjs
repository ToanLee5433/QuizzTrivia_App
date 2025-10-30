#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const viPath = path.join(rootDir, 'public/locales/vi/common.json');
const enPath = path.join(rootDir, 'public/locales/en/common.json');

const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Thêm ALL missing keys cho AdminQuizManagement
const newKeys = {
  vi: {
    refresh: "Làm mới",
    loadingData: "Đang tải dữ liệu...",
    error: "Lỗi",
    tryAgain: "Thử lại",
    quiz: {
      difficulty: {
        easy: "Dễ",
        medium: "Trung bình",
        hard: "Khó"
      },
      questions: "Câu hỏi"
    },
    admin: {
      quizManagement: {
        confirmDelete: "Bạn có chắc chắn muốn xóa quiz này không?",
        learningResources: "tài liệu học tập",
        learningResourcesCount: "{{count}} tài liệu học tập",
        hasRequiredResources: "Có tài liệu bắt buộc",
        editRequestsTitle: "Yêu cầu chỉnh sửa Quiz ({{count}})",
        requestReason: "Lý do yêu cầu",
        requestDetails: "Chi tiết",
        noReason: "Không có lý do cụ thể",
        unknownUser: "Người dùng không xác định",
        unknownEmail: "Email không xác định",
        unknownQuiz: "Tên quiz không xác định",
        unknownTime: "Thời gian không xác định",
        viewResource: "Xem tài liệu",
        requiredBadge: "Bắt buộc",
        estimatedTime: "{{time}} phút",
        empty: {
          noQuizzesInSystem: "Chưa có quiz nào trong hệ thống"
        },
        success: {
          approved: "Đã phê duyệt quiz thành công!",
          rejected: "Đã từ chối quiz!",
          reopened: "Đã mở lại quiz để xem xét!",
          deleted: "Quiz đã được xóa khỏi database"
        },
        errors: {
          loadFailed: "Không thể tải danh sách quiz",
          approveFailed: "Không thể duyệt quiz",
          rejectFailed: "Không thể từ chối quiz",
          reopenFailed: "Không thể mở lại quiz",
          deleteFailed: "Không thể xóa quiz"
        }
      },
      preview: {
        learningResourcesTitle: "Tài liệu học tập ({{count}})"
      },
      editRequests: {
        errors: {
          notFound: "Không tìm thấy yêu cầu chỉnh sửa",
          approveFailed: "Không thể phê duyệt yêu cầu chỉnh sửa",
          rejectFailed: "Không thể từ chối yêu cầu chỉnh sửa"
        },
        success: {
          approved: "Đã phê duyệt yêu cầu chỉnh sửa của {{userName}}!",
          rejected: "Đã từ chối yêu cầu chỉnh sửa của {{userName}}!"
        },
        notifications: {
          approvedTitle: "Yêu cầu chỉnh sửa đã được phê duyệt",
          approvedMessage: "Yêu cầu chỉnh sửa quiz \"{{quizTitle}}\" của bạn đã được admin phê duyệt. Quiz đã được gỡ xuống để bạn chỉnh sửa. Sau khi sửa xong, vui lòng nộp lại để admin duyệt.",
          rejectedTitle: "Yêu cầu chỉnh sửa đã bị từ chối",
          rejectedMessage: "Yêu cầu chỉnh sửa quiz \"{{quizTitle}}\" của bạn đã bị admin từ chối. Vui lòng liên hệ admin để biết thêm chi tiết."
        }
      }
    }
  },
  en: {
    refresh: "Refresh",
    loadingData: "Loading data...",
    error: "Error",
    tryAgain: "Try Again",
    quiz: {
      difficulty: {
        easy: "Easy",
        medium: "Medium",
        hard: "Hard"
      },
      questions: "Questions"
    },
    admin: {
      quizManagement: {
        confirmDelete: "Are you sure you want to delete this quiz?",
        learningResources: "learning resources",
        learningResourcesCount: "{{count}} learning resources",
        hasRequiredResources: "Has required resources",
        editRequestsTitle: "Quiz Edit Requests ({{count}})",
        requestReason: "Request Reason",
        requestDetails: "Details",
        noReason: "No specific reason provided",
        unknownUser: "Unknown user",
        unknownEmail: "Unknown email",
        unknownQuiz: "Unknown quiz title",
        unknownTime: "Unknown time",
        viewResource: "View resource",
        requiredBadge: "Required",
        estimatedTime: "{{time}} minutes",
        empty: {
          noQuizzesInSystem: "No quizzes in the system yet"
        },
        success: {
          approved: "Quiz approved successfully!",
          rejected: "Quiz rejected!",
          reopened: "Quiz reopened for review!",
          deleted: "Quiz deleted from database"
        },
        errors: {
          loadFailed: "Cannot load quiz list",
          approveFailed: "Cannot approve quiz",
          rejectFailed: "Cannot reject quiz",
          reopenFailed: "Cannot reopen quiz",
          deleteFailed: "Cannot delete quiz"
        }
      },
      preview: {
        learningResourcesTitle: "Learning Resources ({{count}})"
      },
      editRequests: {
        errors: {
          notFound: "Edit request not found",
          approveFailed: "Cannot approve edit request",
          rejectFailed: "Cannot reject edit request"
        },
        success: {
          approved: "Approved edit request from {{userName}}!",
          rejected: "Rejected edit request from {{userName}}!"
        },
        notifications: {
          approvedTitle: "Edit request approved",
          approvedMessage: "Your edit request for quiz \"{{quizTitle}}\" has been approved by admin. The quiz has been unlocked for editing. After editing, please resubmit for admin approval.",
          rejectedTitle: "Edit request rejected",
          rejectedMessage: "Your edit request for quiz \"{{quizTitle}}\" has been rejected by admin. Please contact admin for more details."
        }
      }
    }
  }
};

// Deep merge function
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge
deepMerge(viData, newKeys.vi);
deepMerge(enData, newKeys.en);

// Save
fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');

console.log('✅ Added ALL missing AdminQuizManagement keys!');
