#!/usr/bin/env node

/**
 * Thêm tất cả translation keys còn thiếu cho AdminQuizManagement component
 */

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

// Thêm các keys còn thiếu vào admin.quizManagement
if (!viData.admin.quizManagement.tooltips) {
  viData.admin.quizManagement.tooltips = {};
}
if (!enData.admin.quizManagement.tooltips) {
  enData.admin.quizManagement.tooltips = {};
}

// Thêm keys mới
const newKeys = {
  vi: {
    refresh: "Làm mới",
    loadingData: "Đang tải dữ liệu...",
    error: "Lỗi",
    tryAgain: "Thử lại",
    admin: {
      preview: {
        title: "Xem trước Quiz",
        description: "Mô tả",
        category: "Chủ đề",
        difficulty: "Độ khó",
        questions: "Số câu hỏi",
        status: "Trạng thái",
        questionList: "Danh sách câu hỏi"
      },
      editRequests: {
        emptyTitle: "Chưa có yêu cầu chỉnh sửa nào",
        emptyDesc: "Tất cả yêu cầu đã được xử lý",
        pending: "Chờ xử lý",
        approveTitle: "Phê duyệt và cho phép chỉnh sửa",
        approve: "Phê duyệt",
        rejectTitle: "Từ chối yêu cầu",
        reject: "Từ chối"
      }
    }
  },
  en: {
    refresh: "Refresh",
    loadingData: "Loading data...",
    error: "Error",
    tryAgain: "Try Again",
    admin: {
      preview: {
        title: "Quiz Preview",
        description: "Description",
        category: "Category",
        difficulty: "Difficulty",
        questions: "Questions",
        status: "Status",
        questionList: "Question List"
      },
      editRequests: {
        emptyTitle: "No edit requests",
        emptyDesc: "All requests have been processed",
        pending: "Pending",
        approveTitle: "Approve and allow editing",
        approve: "Approve",
        rejectTitle: "Reject request",
        reject: "Reject"
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

console.log('✅ Added AdminQuizManagement translation keys!');
