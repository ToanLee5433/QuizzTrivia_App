import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const viPath = path.join(projectRoot, 'public/locales/vi/common.json');
const enPath = path.join(projectRoot, 'public/locales/en/common.json');

// New translations to add
const newTranslations = {
  vi: {
    "home": {
      "hero": {
        "welcome": "Chào mừng trở lại, {{name}}!",
        "subtitle": "Sẵn sàng thử thách kiến thức của bạn chưa?",
        "description": "Khám phá hàng nghìn quiz thú vị, thử thách bản thân và leo lên bảng xếp hạng! 🚀"
      },
      "stats": {
        "realData": "📈 Dữ liệu thực tế",
        "registered": "👥 Đã đăng ký",
        "pending": "✅ Chờ cập nhật",
        "creatorsAndAdmins": "✨ Creator + Admin"
      },
      "trending": {
        "title": "Quiz Trending",
        "subtitle": "Những quiz được yêu thích nhất",
        "viewAll": "Xem tất cả",
        "noQuizzes": "Chưa có quiz trending",
        "createFirst": "Hãy bắt đầu tạo quiz đầu tiên của bạn!",
        "createNow": "Tạo Quiz ngay"
      },
      "quickActions": {
        "title": "Hành động nhanh",
        "subtitle": "Những thao tác thường dùng để bắt đầu",
        "createDescription": "Thiết kế và chia sẻ quiz của riêng bạn với mọi người",
        "startCreating": "Bắt đầu tạo",
        "randomQuiz": "Quiz ngẫu nhiên",
        "randomDescription": "Nhảy vào một quiz bất kỳ và thử thách kiến thức của bạn",
        "playNow": "Chơi ngay",
        "viewProgress": "Xem tiến độ",
        "progressDescription": "Kiểm tra thành tích và lịch sử làm quiz của bạn"
      },
      "popular": {
        "title": "Quiz phổ biến",
        "subtitle": "Những quiz được yêu thích nhất tuần này"
      }
    }
  },
  en: {
    "home": {
      "hero": {
        "welcome": "Welcome back, {{name}}!",
        "subtitle": "Ready to challenge your knowledge?",
        "description": "Explore thousands of exciting quizzes, challenge yourself and climb the leaderboard! 🚀"
      },
      "stats": {
        "realData": "📈 Real data",
        "registered": "👥 Registered",
        "pending": "✅ Pending update",
        "creatorsAndAdmins": "✨ Creators + Admins"
      },
      "trending": {
        "title": "Trending Quizzes",
        "subtitle": "Most loved quizzes",
        "viewAll": "View all",
        "noQuizzes": "No trending quizzes yet",
        "createFirst": "Start creating your first quiz!",
        "createNow": "Create Quiz Now"
      },
      "quickActions": {
        "title": "Quick Actions",
        "subtitle": "Common actions to get started",
        "createDescription": "Design and share your own quiz with everyone",
        "startCreating": "Start creating",
        "randomQuiz": "Random Quiz",
        "randomDescription": "Jump into any quiz and challenge your knowledge",
        "playNow": "Play now",
        "viewProgress": "View Progress",
        "progressDescription": "Check your achievements and quiz history"
      },
      "popular": {
        "title": "Popular Quizzes",
        "subtitle": "Most loved quizzes this week"
      }
    }
  }
};

function addTranslations() {
  try {
    // Read Vietnamese file
    const viContent = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
    
    // Read English file
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    
    // Merge with new translations
    const updatedVi = { ...viContent, ...newTranslations.vi };
    const updatedEn = { ...enContent, ...newTranslations.en };
    
    // Sort keys alphabetically
    const sortedVi = Object.keys(updatedVi).sort().reduce((acc, key) => {
      acc[key] = updatedVi[key];
      return acc;
    }, {});
    
    const sortedEn = Object.keys(updatedEn).sort().reduce((acc, key) => {
      acc[key] = updatedEn[key];
      return acc;
    }, {});
    
    // Write back to files
    fs.writeFileSync(viPath, JSON.stringify(sortedVi, null, 2), 'utf-8');
    fs.writeFileSync(enPath, JSON.stringify(sortedEn, null, 2), 'utf-8');
    
    console.log('✅ Successfully added home page translations!');
    console.log(`   - Vietnamese: ${Object.keys(newTranslations.vi.home).length} sections added`);
    console.log(`   - English: ${Object.keys(newTranslations.en.home).length} sections added`);
    
  } catch (error) {
    console.error('❌ Error adding translations:', error);
    process.exit(1);
  }
}

addTranslations();
