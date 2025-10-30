import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load missing keys
const missingPath = path.join(rootDir, 'missing-translations.json');
if (!fs.existsSync(missingPath)) {
  console.error('❌ missing-translations.json not found! Run extract-missing-keys.mjs first.');
  process.exit(1);
}

const missingData = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

// Admin translations
const admin = {
  vi: {
    greeting: "Bảng điều khiển Admin",
    dashboard: "Bảng điều khiển quản trị",
    dashboardSubtitle: "Subtitle admin dashboard",
    currentTab: "Tab hiện tại",
    backToOverview: "Quay lại tổng quan",
    greeting: "Chào mừng đến Admin Dashboard",
    loginAsAdmin: "Đăng nhập với quyền Admin",
    roles: "Vai trò",
    exportData: "Xuất dữ liệu",
    exportDataDevelopment: "Xuất dữ liệu (Development)",
    vsLastMonth: "so với tháng trước",
    dataLoadSuccess: "Tải dữ liệu thành công",
    viewingStatsSection: "Đang xem phần thống kê",
    advancedStatsDescription: "Thống kê nâng cao",
    quizApproved: "Quiz đã được phê duyệt",
    quizApprovalError: "Lỗi khi phê duyệt quiz",
    quizRejected: "Quiz đã bị từ chối",
    quizRejectionError: "Lỗi khi từ chối quiz",
    quizReopened: "Quiz đã được mở lại",
    quizReopenError: "Lỗi khi mở lại quiz",
    userStatusUpdateSuccess: "Cập nhật trạng thái user thành công",
    header: {
      title: "Tiêu đề Admin",
      subtitle: "Phụ đề Admin"
    },
    tabs: {
      overview: "Tổng quan",
      users: "Người dùng",
      quizzes: "Quiz",
      categories: "Chủ đề",
      overviewStats: "Thống kê tổng quan",
      userManagement: "Quản lý người dùng",
      quizManagement: "Quản lý Quiz",
      categoryManagement: "Quản lý chủ đề",
      performance: "Hiệu suất"
    },
    stats: {
      totalUsers: "Tổng số người dùng",
      totalCreators: "Tổng số Creator",
      publishedQuizzes: "Quiz đã xuất bản",
      completionAttempts: "Lượt hoàn thành",
      completedAttempts: "Lượt đã hoàn thành",
      createdQuizzes: "Quiz đã tạo",
      userGrowth: "Tăng trưởng người dùng",
      quizActivity: "Hoạt động Quiz",
      ratingDistribution: "Phân bố đánh giá",
      totalReviews: "Tổng số đánh giá",
      performanceOverview: "Tổng quan hiệu suất",
      averageScore: "Điểm trung bình",
      completionRate: "Tỷ lệ hoàn thành",
      averageRating: "Đánh giá trung bình",
      topCategories: "Chủ đề hàng đầu",
      unnamedCategory: "Chủ đề chưa đặt tên",
      recentActivity: "Hoạt động gần đây",
      availableQuizzes: "Quiz khả dụng",
      registeredUsers: "Người dùng đã đăng ký",
      reviews: "Đánh giá",
      completions: "Hoàn thành",
      performanceMetrics: "Số liệu hiệu suất"
    },
    sidebar: {
      title: "Quản trị viên",
      sectionAdmin: "Phần Admin",
      quickActions: "Hành động nhanh",
      createQuiz: "Tạo Quiz",
      backToDashboard: "Quay lại Dashboard",
      nav: {
        dashboard: "Bảng điều khiển",
        quizManagement: "Quản lý Quiz",
        categories: "Chủ đề",
        users: "Người dùng",
        utilities: "Tiện ích",
        roles: "Vai trò"
      }
    },
    quickActions: {
      title: "Hành động nhanh",
      important: "Quan trọng",
      systemStatus: "Trạng thái hệ thống",
      testModal: "Test Modal",
      testModalDesc: "Kiểm tra modal",
      inDevelopment: "Đang phát triển",
      moreSoon: "Sắp có thêm",
      debugPanel: "Bảng Debug",
      modalState: "Trạng thái Modal",
      debugHint: "Gợi ý Debug",
      items: {
        notify: {
          title: "Gửi thông báo",
          desc: "Gửi thông báo cho người dùng"
        },
        deleteNotifications: {
          title: "Xóa thông báo",
          desc: "Xóa tất cả thông báo"
        },
        backup: {
          title: "Sao lưu dữ liệu",
          desc: "Tạo bản sao lưu"
        },
        cleanup: {
          title: "Dọn dẹp",
          desc: "Dọn dẹp dữ liệu cũ"
        }
      },
      modal: {
        title: "Gửi thông báo hệ thống",
        contentLabel: "Nội dung",
        contentPlaceholder: "Nhập nội dung thông báo",
        typeLabel: "Loại thông báo",
        targetLabel: "Đối tượng nhận",
        send: "Gửi",
        sending: "Đang gửi...",
        type: {
          info: "Thông tin",
          warning: "Cảnh báo",
          success: "Thành công",
          error: "Lỗi"
        },
        target: {
          all: "Tất cả",
          user: "User",
          creator: "Creator"
        }
      },
      stats: {
        users: "Người dùng",
        totalQuizzes: "Tổng Quiz",
        creators: "Creator",
        completions: "Hoàn thành"
      },
      toasts: {
        enterMessage: "Vui lòng nhập nội dung",
        createSuccess: "Tạo thành công",
        createError: "Lỗi khi tạo",
        backupSuccess: "Sao lưu thành công",
        backupError: "Lỗi khi sao lưu",
        confirmDeleteAll: "Xác nhận xóa tất cả?",
        deleteSuccess: "Xóa thành công",
        deleteError: "Lỗi khi xóa",
        confirmCleanup: "Xác nhận dọn dẹp?",
        cleanupSuccess: "Dọn dẹp thành công",
        cleanupError: "Lỗi khi dọn dẹp"
      }
    },
    quizManagement: {
      label: "Quản lý Quiz",
      description: "Quản lý tất cả quiz trong hệ thống",
      adminBadge: "Admin",
      searchPlaceholder: "Tìm kiếm quiz...",
      tab: {
        quizzes: "Quiz",
        editRequests: "Yêu cầu chỉnh sửa"
      },
      filter: {
        pending: "Chờ duyệt",
        approved: "Đã duyệt"
      },
      cards: {
        totalQuizzes: "Tổng số Quiz"
      },
      table: {
        title: "Tiêu đề",
        creator: "Người tạo",
        category: "Chủ đề",
        createdAt: "Ngày tạo",
        actions: "Hành động",
        uncategorized: "Chưa phân loại"
      },
      tooltips: {
        edit: "Chỉnh sửa",
        preview: "Xem trước",
        approve: "Phê duyệt",
        reject: "Từ chối",
        reopen: "Mở lại",
        delete: "Xóa",
        viewReviews: "Xem đánh giá"
      },
      empty: {
        noQuizzesTitle: "Chưa có quiz nào",
        noQuizzesDesc: "Hãy tạo quiz đầu tiên",
        noMatchTitle: "Không tìm thấy",
        noMatchDesc: "Thử tìm kiếm khác",
        goToCreator: "Đến trang tạo quiz"
      }
    },
    editRequests: {
      quiz: "Quiz",
      pending: "Đang chờ",
      emptyTitle: "Không có yêu cầu nào",
      emptyDesc: "Tất cả yêu cầu đã được xử lý",
      approveTitle: "Phê duyệt yêu cầu?",
      approve: "Phê duyệt",
      rejectTitle: "Từ chối yêu cầu?",
      reject: "Từ chối"
    },
    preview: {
      title: "Tiêu đề",
      category: "Chủ đề",
      difficulty: "Độ khó",
      description: "Mô tả",
      status: "Trạng thái",
      questions: "câu hỏi",
      questionList: "Danh sách câu hỏi"
    },
    categories: {
      headerDesc: "Quản lý chủ đề quiz",
      enterName: "Nhập tên chủ đề",
      addSuccess: "Thêm chủ đề thành công",
      addError: "Lỗi khi thêm chủ đề",
      deleteSuccess: "Xóa chủ đề thành công",
      deleteError: "Lỗi khi xóa chủ đề"
    },
    users: {
      cannotChangeSelfRole: "Không thể thay đổi quyền của chính mình",
      cannotDeactivateSelf: "Không thể vô hiệu hóa chính mình",
      cannotDeleteSelf: "Không thể xóa chính mình"
    },
    userManagementCards: {
      totalUsers: "Tổng người dùng",
      activeUsers: "Người dùng hoạt động"
    },
    utilities: {
      title: "Tiện ích",
      createTestQuizzes: {
        title: "Tạo Quiz Test",
        desc: "Tạo quiz mẫu để test",
        button: "Tạo Quiz",
        creating: "Đang tạo...",
        created: "Đã tạo",
        alreadyCreated: "Đã tạo rồi",
        success: "Tạo thành công",
        error: "Lỗi khi tạo"
      }
    }
  },
  en: {
    greeting: "Admin Dashboard",
    dashboard: "Admin Dashboard",
    dashboardSubtitle: "Admin dashboard subtitle",
    currentTab: "Current Tab",
    backToOverview: "Back to Overview",
    loginAsAdmin: "Login as Admin",
    roles: "Roles",
    exportData: "Export Data",
    exportDataDevelopment: "Export Data (Development)",
    vsLastMonth: "vs last month",
    dataLoadSuccess: "Data loaded successfully",
    viewingStatsSection: "Viewing stats section",
    advancedStatsDescription: "Advanced statistics",
    quizApproved: "Quiz approved",
    quizApprovalError: "Error approving quiz",
    quizRejected: "Quiz rejected",
    quizRejectionError: "Error rejecting quiz",
    quizReopened: "Quiz reopened",
    quizReopenError: "Error reopening quiz",
    userStatusUpdateSuccess: "User status updated successfully",
    header: {
      title: "Admin Title",
      subtitle: "Admin Subtitle"
    },
    tabs: {
      overview: "Overview",
      users: "Users",
      quizzes: "Quizzes",
      categories: "Categories",
      overviewStats: "Overview Stats",
      userManagement: "User Management",
      quizManagement: "Quiz Management",
      categoryManagement: "Category Management",
      performance: "Performance"
    },
    stats: {
      totalUsers: "Total Users",
      totalCreators: "Total Creators",
      publishedQuizzes: "Published Quizzes",
      completionAttempts: "Completion Attempts",
      completedAttempts: "Completed Attempts",
      createdQuizzes: "Created Quizzes",
      userGrowth: "User Growth",
      quizActivity: "Quiz Activity",
      ratingDistribution: "Rating Distribution",
      totalReviews: "Total Reviews",
      performanceOverview: "Performance Overview",
      averageScore: "Average Score",
      completionRate: "Completion Rate",
      averageRating: "Average Rating",
      topCategories: "Top Categories",
      unnamedCategory: "Unnamed Category",
      recentActivity: "Recent Activity",
      availableQuizzes: "Available Quizzes",
      registeredUsers: "Registered Users",
      reviews: "Reviews",
      completions: "Completions",
      performanceMetrics: "Performance Metrics"
    },
    sidebar: {
      title: "Admin Panel",
      sectionAdmin: "Admin Section",
      quickActions: "Quick Actions",
      createQuiz: "Create Quiz",
      backToDashboard: "Back to Dashboard",
      nav: {
        dashboard: "Dashboard",
        quizManagement: "Quiz Management",
        categories: "Categories",
        users: "Users",
        utilities: "Utilities",
        roles: "Roles"
      }
    },
    quickActions: {
      title: "Quick Actions",
      important: "Important",
      systemStatus: "System Status",
      testModal: "Test Modal",
      testModalDesc: "Test modal",
      inDevelopment: "In Development",
      moreSoon: "More Soon",
      debugPanel: "Debug Panel",
      modalState: "Modal State",
      debugHint: "Debug Hint",
      items: {
        notify: {
          title: "Send Notification",
          desc: "Send notification to users"
        },
        deleteNotifications: {
          title: "Delete Notifications",
          desc: "Delete all notifications"
        },
        backup: {
          title: "Backup Data",
          desc: "Create backup"
        },
        cleanup: {
          title: "Cleanup",
          desc: "Clean old data"
        }
      },
      modal: {
        title: "Send System Notification",
        contentLabel: "Content",
        contentPlaceholder: "Enter notification content",
        typeLabel: "Notification Type",
        targetLabel: "Target Audience",
        send: "Send",
        sending: "Sending...",
        type: {
          info: "Info",
          warning: "Warning",
          success: "Success",
          error: "Error"
        },
        target: {
          all: "All",
          user: "User",
          creator: "Creator"
        }
      },
      stats: {
        users: "Users",
        totalQuizzes: "Total Quizzes",
        creators: "Creators",
        completions: "Completions"
      },
      toasts: {
        enterMessage: "Please enter message",
        createSuccess: "Created successfully",
        createError: "Error creating",
        backupSuccess: "Backup successful",
        backupError: "Backup failed",
        confirmDeleteAll: "Confirm delete all?",
        deleteSuccess: "Deleted successfully",
        deleteError: "Error deleting",
        confirmCleanup: "Confirm cleanup?",
        cleanupSuccess: "Cleanup successful",
        cleanupError: "Cleanup failed"
      }
    },
    quizManagement: {
      label: "Quiz Management",
      description: "Manage all quizzes in the system",
      adminBadge: "Admin",
      searchPlaceholder: "Search quizzes...",
      tab: {
        quizzes: "Quizzes",
        editRequests: "Edit Requests"
      },
      filter: {
        pending: "Pending",
        approved: "Approved"
      },
      cards: {
        totalQuizzes: "Total Quizzes"
      },
      table: {
        title: "Title",
        creator: "Creator",
        category: "Category",
        createdAt: "Created",
        actions: "Actions",
        uncategorized: "Uncategorized"
      },
      tooltips: {
        edit: "Edit",
        preview: "Preview",
        approve: "Approve",
        reject: "Reject",
        reopen: "Reopen",
        delete: "Delete",
        viewReviews: "View Reviews"
      },
      empty: {
        noQuizzesTitle: "No quizzes yet",
        noQuizzesDesc: "Create your first quiz",
        noMatchTitle: "No matches found",
        noMatchDesc: "Try different search",
        goToCreator: "Go to creator page"
      }
    },
    editRequests: {
      quiz: "Quiz",
      pending: "Pending",
      emptyTitle: "No requests",
      emptyDesc: "All requests have been processed",
      approveTitle: "Approve request?",
      approve: "Approve",
      rejectTitle: "Reject request?",
      reject: "Reject"
    },
    preview: {
      title: "Title",
      category: "Category",
      difficulty: "Difficulty",
      description: "Description",
      status: "Status",
      questions: "questions",
      questionList: "Question List"
    },
    categories: {
      headerDesc: "Manage quiz categories",
      enterName: "Enter category name",
      addSuccess: "Category added successfully",
      addError: "Error adding category",
      deleteSuccess: "Category deleted successfully",
      deleteError: "Error deleting category"
    },
    users: {
      cannotChangeSelfRole: "Cannot change your own role",
      cannotDeactivateSelf: "Cannot deactivate yourself",
      cannotDeleteSelf: "Cannot delete yourself"
    },
    userManagementCards: {
      totalUsers: "Total Users",
      activeUsers: "Active Users"
    },
    utilities: {
      title: "Utilities",
      createTestQuizzes: {
        title: "Create Test Quizzes",
        desc: "Create sample quizzes for testing",
        button: "Create Quizzes",
        creating: "Creating...",
        created: "Created",
        alreadyCreated: "Already created",
        success: "Created successfully",
        error: "Error creating"
      }
    }
  }
};

console.log('📝 Writing admin translations to files...\n');

// Write to files
const viPath = path.join(rootDir, 'public', 'locales', 'vi', 'common.json');
const enPath = path.join(rootDir, 'public', 'locales', 'en', 'common.json');

const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Merge admin keys
viData.admin = { ...viData.admin, ...admin.vi };
enData.admin = { ...enData.admin, ...admin.en };

fs.writeFileSync(viPath, JSON.stringify(viData, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2) + '\n', 'utf8');

console.log('✅ Admin translations added successfully!\n');
console.log('📊 Summary:');
console.log(`   - Added ${Object.keys(admin.vi).length} top-level keys to VI`);
console.log(`   - Added ${Object.keys(admin.en).length} top-level keys to EN\n`);
