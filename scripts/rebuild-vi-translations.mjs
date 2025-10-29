#!/usr/bin/env node

/**
 * Rebuild Vietnamese translations from English template
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Complete translation dictionary EN -> VI
const translations = {
  // Common actions
  "Loading...": "Đang tải...",
  "Loading data...": "Đang tải dữ liệu...",
  "Select language": "Chọn ngôn ngữ",
  "Save": "Lưu",
  "Cancel": "Hủy",
  "Delete": "Xóa",
  "Edit": "Chỉnh sửa",
  "Create": "Tạo mới",
  "Update": "Cập nhật",
  "Search": "Tìm kiếm",
  "Filter": "Lọc",
  "Sort": "Sắp xếp",
  "Yes": "Có",
  "No": "Không",
  "OK": "Đồng ý",
  "Back": "Quay lại",
  "Next": "Tiếp theo",
  "Previous": "Trước đó",
  "Close": "Đóng",
  "Open": "Mở",
  "View": "Xem",
  "Download": "Tải xuống",
  "Upload": "Tải lên",
  "Or": "Hoặc",
  "Please wait a moment": "Vui lòng đợi một chút",
  "Checking authentication...": "Đang kiểm tra xác thực...",
  "minutes": "phút",
  "Success": "Thành công",
  "Error": "Lỗi",
  "Welcome": "Chào mừng",
  "Details": "Chi tiết",
  "View details": "Xem chi tiết",
  "Try again": "Thử lại",
  "Start": "Bắt đầu",
  "Finish": "Kết thúc",
  "Complete": "Hoàn thành",
  "Continue": "Tiếp tục",
  "Processing...": "Đang xử lý...",
  "No data": "Không có dữ liệu",
  "Retry": "Thử lại",
  "Refresh": "Làm mới",
  "Created At": "Tạo lúc",
  "Actions": "Hành động",
  
  // Navigation
  "Home": "Trang chủ",
  "Dashboard": "Bảng điều khiển",
  "Quizzes": "Quiz",
  "Offline": "Offline",
  "Multiplayer": "Multiplayer",
  "Favorites": "Yêu thích",
  "Leaderboard": "Bảng xếp hạng",
  "Profile": "Hồ sơ",
  "Settings": "Cài đặt",
  "Admin": "Quản trị",
  "Logout": "Đăng xuất",
  
  // Auth
  "Login": "Đăng nhập",
  "Register": "Đăng ký",
  "Sign In": "Đăng nhập",
  "Sign Up": "Đăng ký",
  "Email": "Email",
  "Password": "Mật khẩu",
  "Confirm Password": "Xác nhận mật khẩu",
  "Forgot Password": "Quên mật khẩu",
  "Reset Password": "Đặt lại mật khẩu",
  "Remember Me": "Ghi nhớ đăng nhập",
  "Don't have an account?": "Chưa có tài khoản?",
  "Already have an account?": "Đã có tài khoản?",
  "Enter your email": "Nhập email của bạn",
  "Enter your password": "Nhập mật khẩu",
  "Invalid credentials": "Thông tin đăng nhập không hợp lệ",
  "Login successful": "Đăng nhập thành công",
  "Logout successful": "Đăng xuất thành công",
  
  // Quiz
  "Quiz": "Quiz",
  "Quizzes": "Quiz",
  "Question": "Câu hỏi",
  "Questions": "Câu hỏi",
  "Answer": "Đáp án",
  "Answers": "Đáp án",
  "Correct answer": "Đáp án đúng",
  "Correct answers": "Đáp án đúng",
  "Create Quiz": "Tạo Quiz",
  "Create quiz": "Tạo quiz",
  "Edit Quiz": "Chỉnh sửa Quiz",
  "Delete Quiz": "Xóa Quiz",
  "Quiz List": "Danh sách Quiz",
  "Take Quiz": "Làm Quiz",
  "Start Quiz": "Bắt đầu Quiz",
  "Submit Quiz": "Nộp bài",
  "Quiz Results": "Kết quả Quiz",
  "Quiz Title": "Tiêu đề Quiz",
  "Quiz Name": "Tên Quiz",
  "Quiz Description": "Mô tả Quiz",
  "Quiz Category": "Chủ đề Quiz",
  "Quiz Difficulty": "Độ khó",
  "Easy": "Dễ",
  "Medium": "Trung bình",
  "Hard": "Khó",
  "Time Limit": "Thời gian",
  "Score": "Điểm",
  "Points": "Điểm",
  "Result": "Kết quả",
  "Results": "Kết quả",
  "Your Score": "Điểm của bạn",
  "Total Questions": "Tổng số câu hỏi",
  "Correct": "Đúng",
  "Incorrect": "Sai",
  "Unanswered": "Chưa trả lời",
  "Question {{number}}": "Câu hỏi {{number}}",
  "of": "của",
  "All Quizzes": "Tất cả Quiz",
  "My Quizzes": "Quiz của tôi",
  "Popular Quizzes": "Quiz phổ biến",
  "Recent Quizzes": "Quiz gần đây",
  "Approved": "Đã duyệt",
  "Pending": "Chờ duyệt",
  "Rejected": "Đã từ chối",
  "Draft": "Bản nháp",
  
  // Learning Resources
  "Learning Resources": "Tài liệu học tập",
  "Resources": "Tài liệu",
  "Add Resource": "Thêm tài liệu",
  "Resource Type": "Loại tài liệu",
  "Resource Title": "Tiêu đề tài liệu",
  "Resource Description": "Mô tả tài liệu",
  "Resource URL": "Đường dẫn",
  "Video": "Video",
  "Audio": "Âm thanh",
  "Image": "Hình ảnh",
  "PDF": "PDF",
  "Document": "Tài liệu",
  "Link": "Liên kết",
  "URL": "URL",
  "Required": "Bắt buộc",
  "Optional": "Không bắt buộc",
  "View Material": "Xem tài liệu",
  "View Resource": "Xem tài liệu",
  "Upload File": "Tải file lên",
  "Choose File": "Chọn file",
  "No resources available": "Không có tài liệu",
  "{{count}} resources": "{{count}} tài liệu",
  "With Resources": "Có tài liệu",
  "Without Resources": "Không có tài liệu",
  "Direct Practice": "Làm trực tiếp",
  
  // User & Profile
  "User": "Người dùng",
  "Users": "Người dùng",
  "Name": "Tên",
  "Full Name": "Họ và tên",
  "Display Name": "Tên hiển thị",
  "Phone": "Số điện thoại",
  "Phone Number": "Số điện thoại",
  "Address": "Địa chỉ",
  "Bio": "Giới thiệu",
  "Avatar": "Ảnh đại diện",
  "Role": "Vai trò",
  "Roles": "Vai trò",
  "Permission": "Quyền",
  "Permissions": "Quyền",
  "Student": "Học viên",
  "Teacher": "Giảng viên",
  "Creator": "Người tạo",
  "Admin": "Quản trị viên",
  "Change Password": "Đổi mật khẩu",
  "Update Profile": "Cập nhật hồ sơ",
  "Edit Profile": "Chỉnh sửa hồ sơ",
  "My Profile": "Hồ sơ của tôi",
  
  // Admin
  "Administration": "Quản trị",
  "Admin Dashboard": "Bảng điều khiển quản trị",
  "User Management": "Quản lý người dùng",
  "Quiz Management": "Quản lý Quiz",
  "Category Management": "Quản lý chủ đề",
  "Statistics": "Thống kê",
  "Stats": "Thống kê",
  "Reports": "Báo cáo",
  "Approve": "Phê duyệt",
  "Reject": "Từ chối",
  "Pending Approval": "Chờ phê duyệt",
  "Approved Quizzes": "Quiz đã duyệt",
  "Rejected Quizzes": "Quiz bị từ chối",
  "Total Users": "Tổng người dùng",
  "Total Quizzes": "Tổng Quiz",
  "Total Questions": "Tổng câu hỏi",
  "Active Users": "Người dùng hoạt động",
  "Active": "Hoạt động",
  "Inactive": "Không hoạt động",
  "Banned": "Bị cấm",
  "Ban User": "Cấm người dùng",
  "Unban User": "Bỏ cấm người dùng",
  
  // Status & Messages
  "Loading": "Đang tải",
  "Saving": "Đang lưu",
  "Deleting": "Đang xóa",
  "Processing": "Đang xử lý",
  "Uploading": "Đang tải lên",
  "Downloading": "Đang tải xuống",
  "Success": "Thành công",
  "Failed": "Thất bại",
  "Warning": "Cảnh báo",
  "Info": "Thông tin",
  "Notification": "Thông báo",
  "Notifications": "Thông báo",
  "Message": "Tin nhắn",
  "Messages": "Tin nhắn",
  "Alert": "Cảnh báo",
  "Confirm": "Xác nhận",
  "Are you sure?": "Bạn có chắc chắn?",
  "This action cannot be undone": "Hành động này không thể hoàn tác",
  "Please confirm": "Vui lòng xác nhận",
  "Operation successful": "Thao tác thành công",
  "Operation failed": "Thao tác thất bại",
  "An error occurred": "Đã xảy ra lỗi",
  "Something went wrong": "Đã có lỗi xảy ra",
  "Please try again": "Vui lòng thử lại",
  "Please enter": "Vui lòng nhập",
  "Please select": "Vui lòng chọn",
  "Required field": "Trường bắt buộc",
  "Invalid format": "Định dạng không hợp lệ",
  "Not found": "Không tìm thấy",
  "No results found": "Không tìm thấy kết quả",
  "No data available": "Không có dữ liệu",
  "Empty": "Trống",
  
  // Time & Date
  "Date": "Ngày",
  "Time": "Thời gian",
  "Day": "Ngày",
  "Week": "Tuần",
  "Month": "Tháng",
  "Year": "Năm",
  "Hour": "Giờ",
  "Minute": "Phút",
  "Second": "Giây",
  "Today": "Hôm nay",
  "Yesterday": "Hôm qua",
  "Tomorrow": "Ngày mai",
  "This week": "Tuần này",
  "This month": "Tháng này",
  "This year": "Năm nay",
  "Last week": "Tuần trước",
  "Last month": "Tháng trước",
  "Created at": "Tạo lúc",
  "Updated at": "Cập nhật lúc",
  "Created by": "Tạo bởi",
  "Updated by": "Cập nhật bởi",
  
  // Categories
  "Category": "Chủ đề",
  "Categories": "Chủ đề",
  "All": "Tất cả",
  "All Categories": "Tất cả chủ đề",
  "Select Category": "Chọn chủ đề",
  "Science": "Khoa học",
  "History": "Lịch sử",
  "Geography": "Địa lý",
  "Math": "Toán học",
  "English": "Tiếng Anh",
  "Literature": "Văn học",
  "Technology": "Công nghệ",
  "Sports": "Thể thao",
  "Entertainment": "Giải trí",
  "Other": "Khác",
  
  // Multiplayer
  "Multiplayer": "Multiplayer",
  "Create Room": "Tạo phòng",
  "Join Room": "Tham gia phòng",
  "Room Code": "Mã phòng",
  "Room Name": "Tên phòng",
  "Host": "Chủ phòng",
  "Players": "Người chơi",
  "Waiting for players": "Đang chờ người chơi",
  "Game starting soon": "Trò chơi sắp bắt đầu",
  "Game in progress": "Đang chơi",
  "Game finished": "Đã kết thúc",
  "Winner": "Người thắng",
  "Rank": "Hạng",
  "Ranking": "Xếp hạng",
  
  // Misc
  "Language": "Ngôn ngữ",
  "Theme": "Giao diện",
  "Light": "Sáng",
  "Dark": "Tối",
  "Help": "Trợ giúp",
  "About": "Giới thiệu",
  "Contact": "Liên hệ",
  "Terms": "Điều khoản",
  "Privacy": "Quyền riêng tư",
  "Version": "Phiên bản",
  "Copyright": "Bản quyền",
  "All rights reserved": "Mọi quyền được bảo lưu",
};

function translateValue(enValue) {
  if (typeof enValue === 'string') {
    return translations[enValue] || enValue;
  } else if (typeof enValue === 'object' && enValue !== null && !Array.isArray(enValue)) {
    const translated = {};
    for (const [key, value] of Object.entries(enValue)) {
      translated[key] = translateValue(value);
    }
    return translated;
  }
  return enValue;
}

async function main() {
  console.log('🔄 Rebuilding Vietnamese translations...\n');
  
  try {
    // Read English translations
    const enPath = path.join(__dirname, '../public/locales/en/common.json');
    const enContent = fs.readFileSync(enPath, 'utf-8');
    const enData = JSON.parse(enContent);
    
    console.log(`✓ Loaded English translations (${Object.keys(enData).length} keys)`);
    
    // Translate to Vietnamese
    const viData = translateValue(enData);
    
    // Save Vietnamese translations
    const viPath = path.join(__dirname, '../public/locales/vi/common.json');
    fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf-8');
    
    console.log(`✓ Saved Vietnamese translations to: ${viPath}`);
    
    // Count translations
    const countKeys = (obj, prefix = '') => {
      let count = 0;
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          count += countKeys(value, `${prefix}${key}.`);
        } else {
          count++;
        }
      }
      return count;
    };
    
    const totalKeys = countKeys(viData);
    console.log(`\n📊 Statistics:`);
    console.log(`  Total translation keys: ${totalKeys}`);
    console.log(`  Dictionary entries used: ${Object.keys(translations).length}`);
    
    console.log('\n✅ Vietnamese translations rebuilt successfully!');
    
    // Clean up old backup files
    const backupFiles = [
      path.join(__dirname, '../public/locales/vi/common.backup.json'),
      path.join(__dirname, '../public/locales/vi/common_fixed.json'),
      path.join(__dirname, '../public/locales/vi/common-fixed.json'),
      path.join(__dirname, '../public/locales/en/common_fixed.json'),
    ];
    
    console.log('\n🧹 Cleaning up backup files...');
    for (const file of backupFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`  ✓ Deleted: ${path.basename(file)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
