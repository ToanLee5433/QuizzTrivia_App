# Complete i18n Integration Script
Write-Host "🌐 Complete i18n Integration for Quiz App" -ForegroundColor Green

# Define comprehensive text replacements
$replacements = @{
    # Common UI texts
    "'Đang tải...'" = "t('common.loading', 'Đang tải...')"
    "'Lưu'" = "t('common.save', 'Lưu')"
    "'Hủy'" = "t('common.cancel', 'Hủy')"
    "'Xóa'" = "t('common.delete', 'Xóa')"
    "'Chỉnh sửa'" = "t('common.edit', 'Chỉnh sửa')"
    "'Tạo mới'" = "t('common.create', 'Tạo mới')"
    "'Cập nhật'" = "t('common.update', 'Cập nhật')"
    "'Tìm kiếm'" = "t('common.search', 'Tìm kiếm')"
    "'Có'" = "t('common.yes', 'Có')"
    "'Không'" = "t('common.no', 'Không')"
    "'Đóng'" = "t('common.close', 'Đóng')"
    "'Xem'" = "t('common.view', 'Xem')"
    
    # Quiz related
    "'Làm Quiz'" = "t('quiz.takeQuiz', 'Làm Quiz')"
    "'Tạo Quiz'" = "t('quiz.create', 'Tạo Quiz')"
    "'Bắt đầu Quiz'" = "t('quiz.startQuiz', 'Bắt đầu Quiz')"
    "'Nộp bài'" = "t('quiz.submitQuiz', 'Nộp bài')"
    "'Kết quả'" = "t('quiz.result', 'Kết quả')"
    "'Điểm số'" = "t('quiz.score', 'Điểm số')"
    "'Câu hỏi'" = "t('quiz.questions', 'Câu hỏi')"
    "'Tiêu đề'" = "t('quiz.title', 'Tiêu đề')"
    "'Mô tả'" = "t('quiz.description', 'Mô tả')"
    "'Danh mục'" = "t('quiz.category', 'Danh mục')"
    "'Độ khó'" = "t('quiz.difficulty', 'Độ khó')"
    "'Thời gian'" = "t('quiz.duration', 'Thời gian')"
    "'Chơi ngay'" = "t('quiz.playNow', 'Chơi ngay')"
    "'Xem trước'" = "t('quiz.preview', 'Xem trước')"
    
    # Difficulty levels
    "'Dễ'" = "t('difficulty.easy', 'Dễ')"
    "'Trung bình'" = "t('difficulty.medium', 'Trung bình')"
    "'Khó'" = "t('difficulty.hard', 'Khó')"
    
    # Profile related
    "'Hồ sơ của tôi'" = "t('profile.myProfile', 'Hồ sơ của tôi')"
    "'Chỉnh sửa hồ sơ'" = "t('profile.editProfile', 'Chỉnh sửa hồ sơ')"
    "'Đổi mật khẩu'" = "t('profile.changePassword', 'Đổi mật khẩu')"
    "'Mật khẩu hiện tại'" = "t('profile.currentPassword', 'Mật khẩu hiện tại')"
    "'Mật khẩu mới'" = "t('profile.newPassword', 'Mật khẩu mới')"
    
    # Admin related
    "'Quản lý người dùng'" = "t('admin.userManagement', 'Quản lý người dùng')"
    "'Quản lý Quiz'" = "t('admin.quizManagement', 'Quản lý Quiz')"
    "'Thống kê'" = "t('admin.statistics', 'Thống kê')"
    "'Cài đặt'" = "t('admin.settings', 'Cài đặt')"
    
    # Error messages
    "'Có lỗi xảy ra'" = "t('messages.error', 'Có lỗi xảy ra')"
    "'Thành công'" = "t('messages.success', 'Thành công')"
    "'Không có dữ liệu'" = "t('messages.noData', 'Không có dữ liệu')"
    "'Lỗi kết nối mạng'" = "t('messages.networkError', 'Lỗi kết nối mạng')"
    
    # Auth related
    "'Cần đăng nhập'" = "t('auth.loginRequired', 'Cần đăng nhập')"
    "'Bạn cần đăng nhập'" = "t('auth.loginRequiredMessage', 'Bạn cần đăng nhập')"
}

# Additional comprehensive keys to add to i18n
$additionalViKeys = @"
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
        "takeQuiz": "Làm Quiz",
        "myQuizzes": "Quiz của tôi",
        "popularQuizzes": "Quiz phổ biến",
        "completed": "Đã hoàn thành",
        "attempts": "Lượt chơi",
        "averageScore": "Điểm trung bình",
        "players": "Người chơi",
        "tags": "Thẻ",
        "published": "Đã xuất bản",
        "draft": "Bản nháp",
        "searchPlaceholder": "🔍 Tìm kiếm quiz, danh mục, tags...",
        "createLoginRequired": "Bạn cần đăng nhập để tạo quiz"
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
"@

$additionalEnKeys = @"
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
        "takeQuiz": "Take Quiz",
        "myQuizzes": "My Quizzes",
        "popularQuizzes": "Popular Quizzes",
        "completed": "Completed",
        "attempts": "Attempts",
        "averageScore": "Average Score",
        "players": "Players",
        "tags": "Tags",
        "published": "Published",
        "draft": "Draft",
        "searchPlaceholder": "🔍 Search quizzes, categories, tags...",
        "createLoginRequired": "You need to login to create quizzes"
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
        "currentPasswordRequired": "You need to enter the correct current password to authenticate before changing to a new password"
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
"@

# Function to add useTranslation to a file
function Add-UseTranslation {
    param($filePath)
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Add import if not exists
        if ($content -notmatch "useTranslation") {
            $content = $content -replace "(import.*from 'react';)", "`$1`nimport { useTranslation } from 'react-i18next';"
        }
        
        # Add hook if not exists
        if ($content -notmatch "const.*t.*=.*useTranslation") {
            $content = $content -replace "(const.*:\s*React\.FC.*=.*\(\).*=>\s*\{)", "`$1`n  const { t } = useTranslation();"
        }
        
        return $content
    }
    return $null
}

# Function to apply replacements to content
function Apply-Replacements {
    param($content, $replacements)
    
    foreach ($replacement in $replacements.GetEnumerator()) {
        $content = $content -replace [regex]::Escape($replacement.Key), $replacement.Value
    }
    
    return $content
}

# List of files to process
$filesToProcess = @(
    "src\features\quiz\pages\LeaderboardPage.tsx",
    "src\features\quiz\pages\CreateQuizPage\index.tsx",
    "src\features\quiz\pages\QuizPage.tsx", 
    "src\features\quiz\components\QuizCard.tsx",
    "src\shared\pages\Creator.tsx",
    "src\features\auth\pages\Profile.tsx",
    "src\features\admin\pages\Admin.tsx",
    "src\features\admin\pages\AdminUserManagement.tsx",
    "src\features\admin\pages\AdminQuizManagement.tsx",
    "src\features\quiz\components\ReviewForm.tsx",
    "src\shared\components\QuizReviewSystem.tsx"
)

Write-Host "📝 Processing files..." -ForegroundColor Yellow

foreach ($file in $filesToProcess) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor Cyan
        
        $content = Add-UseTranslation -filePath $file
        if ($content) {
            $content = Apply-Replacements -content $content -replacements $replacements
            Set-Content $file $content -Encoding UTF8
            Write-Host "✅ Updated: $file" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "🎉 i18n integration completed!" -ForegroundColor Green
Write-Host "📄 Remember to add the additional keys to your i18n configuration file manually." -ForegroundColor Yellow
