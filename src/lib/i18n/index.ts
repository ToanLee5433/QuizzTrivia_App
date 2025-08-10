import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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
        "minutes": "phút"
      },
      
      // Navigation
      "nav": {
        "home": "Trang chủ",
        "dashboard": "Bảng điều khiển",
        "quizzes": "Quiz",
        "favorites": "Yêu thích",
        "leaderboard": "Bảng xếp hạng",
        "profile": "Hồ sơ",
        "creator": "Creator",
        "admin": "Quản trị",
        "login": "Đăng nhập",
        "logout": "Đăng xuất",
        "register": "Đăng ký"
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
        }
      },
      
      // Auth
      "auth": {
        "login": "Đăng nhập",
        "register": "Đăng ký",
        "email": "Email",
        "password": "Mật khẩu",
        "confirmPassword": "Xác nhận mật khẩu",
        "displayName": "Tên hiển thị",
        "loginSuccess": "Đăng nhập thành công!",
        "registerSuccess": "Đăng ký thành công!",
        "googleLoginSuccess": "Đăng nhập Google thành công!",
        "loginWithGoogle": "Đăng nhập với Google",
        "forgotPassword": "Quên mật khẩu?",
        "emailVerification": "Xác thực email",
        "emailVerificationSent": "Email xác thực đã được gửi! Hãy kiểm tra hộp thư và click vào link xác thực.",
        "emailNotVerified": "Tài khoản của bạn chưa được xác thực email. Vui lòng kiểm tra hộp thư và click vào link xác thực, sau đó thử đăng nhập lại.",
        "welcomeBack": "Chào mừng trở lại!",
        "createNewAccount": "Tạo tài khoản mới",
        "emailPlaceholder": "Nhập email của bạn",
        "passwordPlaceholder": "Nhập mật khẩu",
        "displayNamePlaceholder": "Nhập tên hiển thị",
        "confirmPasswordPlaceholder": "Xác nhận mật khẩu",
        "noAccount": "Chưa có tài khoản? Đăng ký ngay",
        "hasAccount": "Đã có tài khoản? Đăng nhập",
        "agreeToTerms": "Tôi đồng ý với",
        "termsOfService": "điều khoản sử dụng",
        "loginRequired": "Cần đăng nhập",
        "errors": {
          "userNotFound": "Email không tồn tại",
          "wrongPassword": "Mật khẩu không đúng",
          "invalidCredential": "Email hoặc mật khẩu không đúng",
          "invalidEmail": "Email không hợp lệ",
          "userDisabled": "Tài khoản đã bị vô hiệu hóa",
          "tooManyRequests": "Quá nhiều lần thử. Vui lòng thử lại sau",
          "loginError": "Lỗi đăng nhập: {{message}}",
          "googleLoginError": "Lỗi đăng nhập Google: {{message}}"
        }
      },
      
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
        "createLoginRequired": "Bạn cần đăng nhập để tạo quiz",
        "reviewsTitle": "Đánh giá",
        "submitReview": "Gửi đánh giá",
        "rating": "Đánh giá",
        "reviewText": "Nội dung đánh giá",
        "loadError": "Lỗi khi tải danh sách quiz",
        "editReasonRequired": "Vui lòng nhập lý do chỉnh sửa",
        "editRequestError": "Lỗi khi gửi yêu cầu chỉnh sửa",
        "createSuccess": "Tạo quiz thành công",
        "updateSuccess": "Cập nhật quiz thành công",
        "deleteSuccess": "Xóa quiz thành công",
        "loading": "Đang tải quiz...",
        "notFound": "Quiz không tồn tại",
        "backToQuizList": "Về danh sách quiz",
        "questionsCount": "{{count}} câu hỏi",
        "timeLimit": "{{time}} phút",
        "noTimeLimit": "Không giới hạn",
        "startQuizButton": "Bắt đầu Quiz",
        "viewReviews": "Xem đánh giá",
        "detailedInfo": "Thông tin chi tiết",
        "questionType": "Dạng câu hỏi",
        "questionTypes": {
          "multiple": "Trắc nghiệm",
          "boolean": "Đúng/Sai",
          "short_answer": "Tự luận"
        },
        "stats": "Thống kê",
        "author": "Tác giả",
        "topics": "Chủ đề",
        "moreQuestions": "... và {{count}} câu hỏi khác",
        "points": "Điểm: {{points}}",
        "type": "Loại: {{type}}",
        "ratingCount": "{{count}} đánh giá",
        "reviewCount": "Lượt đánh giá",
        "previewPage": {
          "title": "Xem trước Quiz",
          "loadingQuiz": "Đang tải quiz...",
          "quizNotFound": "Quiz không tồn tại",
          "backToList": "Về danh sách quiz"
        },
        "reviews": {
          "title": "Đánh giá Quiz",
          "reviewsCount": "đánh giá",
          "loginRequired": "Bạn cần đăng nhập để đánh giá quiz",
          "ratingRequired": "Vui lòng chọn số sao đánh giá",
          "commentTooShort": "Nhận xét cần ít nhất 10 ký tự",
          "submitSuccess": "Cảm ơn bạn đã đánh giá quiz!",
          "submitError": "Có lỗi xảy ra khi gửi đánh giá",
          "reviewQuiz": "Đánh giá {{quizTitle}}",
          "yourRating": "Đánh giá của bạn",
          "comment": "Nhận xét",
          "commentPlaceholder": "Chia sẻ cảm nhận của bạn về quiz này...",
          "submitting": "Đang gửi...",
          "submitReview": "Gửi đánh giá",
          "alreadyReviewed": "Bạn đã đánh giá quiz này. Cảm ơn phản hồi của bạn!",
          "noReviews": "Chưa có đánh giá nào",
          "beFirst": "Hãy là người đầu tiên đánh giá quiz này!"
        }
      },

      // Create Quiz
      "createQuiz": {
        "title": "Tạo Quiz Mới",
        "back": "Quay lại",
        "continue": "Tiếp tục",
        "publish": "Xuất bản Quiz",
        "completeInfoFirst": "Vui lòng hoàn thành thông tin trước khi tiếp tục",
        "createSuccess": "Tạo quiz thành công! Quiz đang chờ admin duyệt.",
        "createError": "Có lỗi xảy ra khi tạo quiz",
        "loginRequired": "Bạn cần đăng nhập để tạo quiz",
        "completeAllInfo": "Vui lòng hoàn thành tất cả thông tin quiz",
        "steps": {
          "info": "Thông tin Quiz",
          "questions": "Câu hỏi",
          "review": "Xem lại & Xuất bản"
        },
        "info": {
          "basicInfo": "Thông tin cơ bản",
          "fillInfo": "Điền thông tin để tạo quiz của bạn",
          "titleLabel": "Tiêu đề quiz *",
          "titlePlaceholder": "Nhập tiêu đề thu hút cho quiz của bạn...",
          "descriptionLabel": "Mô tả quiz * (Hỗ trợ định dạng Rich Text)",
          "descriptionPlaceholder": "Mô tả chi tiết về quiz của bạn... Bạn có thể thêm định dạng text, hình ảnh, video và nhiều hơn nữa!",
          "categoryLabel": "Danh mục *",
          "categoryPlaceholder": "Chọn danh mục",
          "difficultyLabel": "Độ khó *",
          "difficultyPlaceholder": "Chọn mức độ khó",
          "durationLabel": "Thời gian (phút) *",
          "imageLabel": "Hình ảnh (tùy chọn)",
          "imagePlaceholder": "URL hình ảnh đại diện cho quiz...",
          "preview": "Xem trước thông tin quiz",
          "previewTitle": "Tiêu đề: {{title}}",
          "previewDescription": "Mô tả: {{description}}",
          "previewCategory": "Danh mục: {{category}}",
          "previewDifficulty": "Độ khó: {{difficulty}}",
          "previewDuration": "Thời gian: {{duration}} phút",
          "previewImage": "Hình ảnh:",
          "noTitle": "Chưa có tiêu đề",
          "noDescription": "Chưa có mô tả",
          "noCategory": "Chưa chọn",
          "noDifficulty": "Chưa chọn"
        }
      },
      
      // Dashboard
      "dashboard": {
        "welcome": "Xin chào, {{name}}!",
        "totalQuizzes": "Tổng số Quiz",
        "totalUsers": "Người dùng",
        "completedQuizzes": "Quiz hoàn thành",
        "totalCreators": "Người tạo",
        "realTimeData": "Dữ liệu thực tế",
        "registered": "Đã đăng ký",
        "pending": "Chờ cập nhật",
        "creatorsAndAdmins": "Creator + Admin",
        "takeQuizzes": "Thử thách kiến thức với các bài quiz đa dạng",
        "favoriteQuizzes": "Các quiz bạn đã lưu để làm sau",
        "viewRanking": "Xem thứ hạng và thành tích của bạn",
        "editProfile": "Xem và chỉnh sửa thông tin cá nhân",
        "createQuizzes": "Tạo các bài quiz của riêng bạn",
        "adminPanel": "Quản lý người dùng và hệ thống"
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
        "currentPasswordRequired": "Bạn cần nhập đúng mật khẩu hiện tại để xác thực trước khi đổi mật khẩu mới",
        "profileUpdateSuccess": "Cập nhật profile thành công!",
        "profileUpdateError": "Có lỗi khi cập nhật profile",
        "fillAllFields": "Vui lòng nhập đầy đủ tất cả các trường",
        "passwordMismatch": "Mật khẩu mới và xác nhận mật khẩu không khớp",
        "passwordTooShort": "Mật khẩu mới phải có ít nhất 6 ký tự",
        "passwordMustDiffer": "Mật khẩu mới phải khác mật khẩu hiện tại",
        "emailNotFound": "Không tìm thấy email người dùng",
        "wrongPassword": "Mật khẩu cũ không đúng",
        "weakPassword": "Mật khẩu mới quá yếu. Vui lòng chọn mật khẩu mạnh hơn (ít nhất 6 ký tự)",
        "requiresRecentLogin": "Phiên đăng nhập đã hết hạn. Vui lòng đăng xuất và đăng nhập lại",
        "loginRequired": "Vui lòng đăng nhập để xem profile"
      },
      
      // Admin
      "admin": {
        "dashboard": "Bảng điều khiển Admin",
        "userManagement": "Quản lý người dùng",
        "quizManagement": "Quản lý Quiz",
        "categoryManagement": "Quản lý danh mục",
        "statistics": "Thống kê",
        "settings": "Cài đặt",
        "dataLoadError": "Có lỗi khi tải dữ liệu!",
        "roleUpdateSuccess": "Đã cập nhật role thành công!",
        "roleUpdateError": "Có lỗi xảy ra khi cập nhật role!",
        "userStatusUpdateSuccess": "Đã {{action}} tài khoản!",
        "statusUpdateError": "Có lỗi xảy ra khi cập nhật trạng thái!",
        "userDeleteSuccess": "Đã xóa người dùng thành công!",
        "userDeleteError": "Có lỗi xảy ra khi xóa người dùng!",
        "activated": "kích hoạt",
        "deactivated": "vô hiệu hóa",
        "realDataLoadError": "Lỗi khi tải dữ liệu thực tế",
        "loadingRealData": "Đang tải dữ liệu thực tế..."
      },
      
      // Categories
      "categories": {
        "programming": "Lập trình",
        "webDevelopment": "Phát triển Web",
        "science": "Khoa học",
        "mathematics": "Toán học",
        "generalKnowledge": "Kiến thức tổng hợp",
        "history": "Lịch sử",
        "sports": "Thể thao",
        "entertainment": "Giải trí"
      },
      
      // Difficulty levels
      "difficulty": {
        "easy": "Dễ",
        "medium": "Trung bình",
        "hard": "Khó"
      },
      
      // Messages
      "messages": {
        "error": "Có lỗi xảy ra",
        "success": "Thành công",
        "noData": "Không có dữ liệu",
        "networkError": "Lỗi kết nối mạng",
        "unauthorized": "Không có quyền truy cập",
        "notFound": "Không tìm thấy",
        "serverError": "Lỗi máy chủ"
      },

      // Favorites
      "favorites": {
        "title": "Quiz Yêu Thích",
        "loginRequired": "Bạn cần đăng nhập để xem quiz yêu thích.",
        "loadError": "Không thể tải danh sách quiz. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.",
        "fetchError": "Không thể tải quiz yêu thích."
      },

      // Creator
      "creator": {
        "loginMessage": "Bạn cần đăng nhập để truy cập trang Creator",
        "roleRequired": "Bạn cần có vai trò Creator hoặc Admin để truy cập trang này",
        "createNewQuiz": "Tạo Quiz mới"
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
        "minutes": "minutes"
      },
      
      // Navigation
      "nav": {
        "home": "Home",
        "dashboard": "Dashboard",
        "quizzes": "Quizzes",
        "favorites": "Favorites",
        "leaderboard": "Leaderboard",
        "profile": "Profile",
        "creator": "Creator",
        "admin": "Admin",
        "login": "Login",
        "logout": "Logout",
        "register": "Register"
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
        }
      },
      
      // Auth
      "auth": {
        "login": "Login",
        "register": "Register",
        "email": "Email",
        "password": "Password",
        "confirmPassword": "Confirm Password",
        "displayName": "Display Name",
        "loginSuccess": "Login successful!",
        "registerSuccess": "Registration successful!",
        "googleLoginSuccess": "Google login successful!",
        "loginWithGoogle": "Sign in with Google",
        "forgotPassword": "Forgot password?",
        "emailVerification": "Email Verification",
        "emailVerificationSent": "Verification email sent! Please check your inbox and click the verification link.",
        "emailNotVerified": "Your account has not been verified. Please check your email and click the verification link, then try logging in again.",
        "welcomeBack": "Welcome back!",
        "createNewAccount": "Create new account",
        "emailPlaceholder": "Enter your email",
        "passwordPlaceholder": "Enter your password",
        "displayNamePlaceholder": "Enter display name",
        "confirmPasswordPlaceholder": "Confirm password",
        "noAccount": "Don't have an account? Sign up now",
        "hasAccount": "Already have an account? Sign in",
        "agreeToTerms": "I agree to the",
        "termsOfService": "terms of service",
        "loginRequired": "Login Required",
        "errors": {
          "userNotFound": "Email does not exist",
          "wrongPassword": "Incorrect password",
          "invalidCredential": "Invalid email or password",
          "invalidEmail": "Invalid email",
          "userDisabled": "Account has been disabled",
          "tooManyRequests": "Too many attempts. Please try again later",
          "loginError": "Login error: {{message}}",
          "googleLoginError": "Google login error: {{message}}"
        }
      },
      
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
        "createLoginRequired": "You need to login to create quizzes",
        "reviewsTitle": "Reviews",
        "submitReview": "Submit Review",
        "rating": "Rating",
        "reviewText": "Review Content",
        "loadError": "Error loading quiz list",
        "editReasonRequired": "Please enter a reason for editing",
        "editRequestError": "Error sending edit request",
        "createSuccess": "Quiz created successfully",
        "updateSuccess": "Quiz updated successfully",
        "deleteSuccess": "Quiz deleted successfully",
        "loading": "Loading quiz...",
        "notFound": "Quiz not found",
        "backToQuizList": "Back to quiz list",
        "questionsCount": "{{count}} questions",
        "timeLimit": "{{time}} minutes",
        "noTimeLimit": "No time limit",
        "startQuizButton": "Start Quiz",
        "viewReviews": "View Reviews",
        "detailedInfo": "Detailed Information",
        "questionType": "Question Types",
        "questionTypes": {
          "multiple": "Multiple Choice",
          "boolean": "True/False",
          "short_answer": "Short Answer"
        },
        "stats": "Statistics",
        "author": "Author",
        "topics": "Topics",
        "moreQuestions": "... and {{count}} more questions",
        "points": "Points: {{points}}",
        "type": "Type: {{type}}",
        "ratingCount": "{{count}} reviews",
        "reviewCount": "Review Count",
        "previewPage": {
          "title": "Quiz Preview",
          "loadingQuiz": "Loading quiz...",
          "quizNotFound": "Quiz not found",
          "backToList": "Back to quiz list"
        },
        "reviews": {
          "title": "Quiz Reviews",
          "reviewsCount": "reviews",
          "loginRequired": "You need to login to review this quiz",
          "ratingRequired": "Please select a star rating",
          "commentTooShort": "Comment must be at least 10 characters",
          "submitSuccess": "Thank you for reviewing this quiz!",
          "submitError": "An error occurred while submitting your review",
          "reviewQuiz": "Review {{quizTitle}}",
          "yourRating": "Your Rating",
          "comment": "Comment",
          "commentPlaceholder": "Share your thoughts about this quiz...",
          "submitting": "Submitting...",
          "submitReview": "Submit Review",
          "alreadyReviewed": "You have already reviewed this quiz. Thank you for your feedback!",
          "noReviews": "No reviews yet",
          "beFirst": "Be the first to review this quiz!"
        }
      },

      // Create Quiz
      "createQuiz": {
        "title": "Create New Quiz",
        "back": "Back",
        "continue": "Continue",
        "publish": "Publish Quiz",
        "completeInfoFirst": "Please complete the information before continuing",
        "createSuccess": "Quiz created successfully! Quiz is awaiting admin approval.",
        "createError": "An error occurred while creating quiz",
        "loginRequired": "You need to login to create quiz",
        "completeAllInfo": "Please complete all quiz information",
        "steps": {
          "info": "Quiz Information",
          "questions": "Questions",
          "review": "Review & Publish"
        },
        "info": {
          "basicInfo": "Basic Information",
          "fillInfo": "Fill in the information to create your quiz",
          "titleLabel": "Quiz Title *",
          "titlePlaceholder": "Enter an attractive title for your quiz...",
          "descriptionLabel": "Quiz Description * (Rich Text Supported)",
          "descriptionPlaceholder": "Detailed description of your quiz... You can add text formatting, images, videos and more!",
          "categoryLabel": "Category *",
          "categoryPlaceholder": "Select category",
          "difficultyLabel": "Difficulty *",
          "difficultyPlaceholder": "Select difficulty level",
          "durationLabel": "Duration (minutes) *",
          "imageLabel": "Image (optional)",
          "imagePlaceholder": "URL of representative image for quiz...",
          "preview": "Preview quiz information",
          "previewTitle": "Title: {{title}}",
          "previewDescription": "Description: {{description}}",
          "previewCategory": "Category: {{category}}",
          "previewDifficulty": "Difficulty: {{difficulty}}",
          "previewDuration": "Duration: {{duration}} minutes",
          "previewImage": "Image:",
          "noTitle": "No title yet",
          "noDescription": "No description yet",
          "noCategory": "Not selected",
          "noDifficulty": "Not selected"
        }
      },
      
      // Dashboard
      "dashboard": {
        "welcome": "Hello, {{name}}!",
        "totalQuizzes": "Total Quizzes",
        "totalUsers": "Users",
        "completedQuizzes": "Completed Quizzes",
        "totalCreators": "Creators",
        "realTimeData": "Real-time Data",
        "registered": "Registered",
        "pending": "Pending Update",
        "creatorsAndAdmins": "Creators + Admins",
        "takeQuizzes": "Challenge your knowledge with diverse quizzes",
        "favoriteQuizzes": "Quizzes you've saved for later",
        "viewRanking": "View your ranking and achievements",
        "editProfile": "View and edit your personal information",
        "createQuizzes": "Create your own quizzes",
        "adminPanel": "Manage users and system"
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
        "currentPasswordRequired": "You need to enter your current password correctly to authenticate before changing to a new password",
        "profileUpdateSuccess": "Profile updated successfully!",
        "profileUpdateError": "Error updating profile",
        "fillAllFields": "Please fill in all fields",
        "passwordMismatch": "New password and confirm password do not match",
        "passwordTooShort": "New password must be at least 6 characters",
        "passwordMustDiffer": "New password must be different from current password",
        "emailNotFound": "User email not found",
        "wrongPassword": "Current password is incorrect",
        "weakPassword": "New password is too weak. Please choose a stronger password (at least 6 characters)",
        "requiresRecentLogin": "Login session has expired. Please logout and login again",
        "loginRequired": "Please login to view your profile"
      },
      
      // Admin
      "admin": {
        "dashboard": "Admin Dashboard",
        "userManagement": "User Management",
        "quizManagement": "Quiz Management",
        "categoryManagement": "Category Management",
        "statistics": "Statistics",
        "settings": "Settings",
        "dataLoadError": "Error loading data!",
        "roleUpdateSuccess": "Role updated successfully!",
        "roleUpdateError": "Error updating role!",
        "userStatusUpdateSuccess": "Account {{action}} successfully!",
        "statusUpdateError": "Error updating status!",
        "userDeleteSuccess": "User deleted successfully!",
        "userDeleteError": "Error deleting user!",
        "activated": "activated",
        "deactivated": "deactivated",
        "realDataLoadError": "Error loading real data",
        "loadingRealData": "Loading real data..."
      },
      
      // Categories
      "categories": {
        "programming": "Programming",
        "webDevelopment": "Web Development",
        "science": "Science",
        "mathematics": "Mathematics",
        "generalKnowledge": "General Knowledge",
        "history": "History",
        "sports": "Sports",
        "entertainment": "Entertainment"
      },
      
      // Difficulty levels
      "difficulty": {
        "easy": "Easy",
        "medium": "Medium",
        "hard": "Hard"
      },
      
      // Messages
      "messages": {
        "error": "An error occurred",
        "success": "Success",
        "noData": "No data available",
        "networkError": "Network error",
        "unauthorized": "Unauthorized access",
        "notFound": "Not found",
        "serverError": "Server error"
      },

      // Favorites
      "favorites": {
        "title": "Favorite Quizzes",
        "loginRequired": "You need to login to view favorite quizzes.",
        "loadError": "Unable to load quiz list. Please check your network connection or try again later.",
        "fetchError": "Unable to load favorite quizzes."
      },

      // Creator
      "creator": {
        "loginMessage": "You need to login to access the Creator page",
        "roleRequired": "You need Creator or Admin role to access this page",
        "createNewQuiz": "Create New Quiz"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // default language
    fallbackLng: 'vi',
    
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false // React already does escaping
    }
  });

export default i18n;
