import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newKeys = {
  editQuiz: {
    notFound: "Quiz not found",
    loadFailed: "Failed to load quiz",
    titleRequired: "Quiz title is required",
    questionRequired: "Quiz must have at least one question",
    updateSuccess: "✅ Quiz updated successfully!",
    resubmitSuccess: "✅ Quiz đã được cập nhật và nộp lại để admin duyệt!",
    updateFailed: "Failed to update quiz",
    confirmDeleteQuestion: "Are you sure you want to delete this question?",
    
    loading: "Loading quiz...",
    notFoundTitle: "Quiz Not Found",
    notFoundDesc: "The quiz you're looking for doesn't exist.",
    backToAdmin: "Back to Admin",
    
    title: "Edit Quiz",
    subtitle: "Modify quiz content and settings",
    
    notifications: {
      resubmitted: "Quiz đã được sửa và nộp lại",
      resubmittedMessage: "Quiz \"{{title}}\" đã được creator sửa xong và nộp lại để admin duyệt."
    },
    
    tabs: {
      info: "Quiz Info",
      questions: "Questions",
      settings: "Settings"
    },
    
    labels: {
      title: "Tiêu đề Quiz",
      description: "Mô tả",
      category: "Chủ đề",
      difficulty: "Độ khó",
      timeLimit: "Thời gian làm bài (phút)",
      passingScore: "Điểm đạt (%)",
      tags: "Tags",
      status: "Trạng thái"
    },
    
    buttons: {
      back: "Quay lại",
      save: "Save Changes",
      saving: "Saving...",
      addQuestion: "Thêm câu hỏi"
    }
  }
};

// Add keys to both VI and EN files
const localesDir = path.join(__dirname, '..', 'public', 'locales');

// Vietnamese
const viPath = path.join(localesDir, 'vi', 'common.json');
const viData = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
viData.editQuiz = newKeys.editQuiz;

// Add missing categories
if (!viData.categories) viData.categories = {};
viData.categories.general = 'Tổng hợp';
viData.categories.math = 'Toán học';
viData.categories.technology = 'Công nghệ';
viData.categories.food = 'Ẩm thực';

fs.writeFileSync(viPath, JSON.stringify(viData, null, 2), 'utf-8');

// English
const enKeys = {
  editQuiz: {
    notFound: "Quiz not found",
    loadFailed: "Failed to load quiz",
    titleRequired: "Quiz title is required",
    questionRequired: "Quiz must have at least one question",
    updateSuccess: "✅ Quiz updated successfully!",
    resubmitSuccess: "✅ Quiz has been updated and resubmitted for admin approval!",
    updateFailed: "Failed to update quiz",
    confirmDeleteQuestion: "Are you sure you want to delete this question?",
    
    loading: "Loading quiz...",
    notFoundTitle: "Quiz Not Found",
    notFoundDesc: "The quiz you're looking for doesn't exist.",
    backToAdmin: "Back to Admin",
    
    title: "Edit Quiz",
    subtitle: "Modify quiz content and settings",
    
    notifications: {
      resubmitted: "Quiz has been edited and resubmitted",
      resubmittedMessage: "Quiz \"{{title}}\" has been edited by creator and resubmitted for admin approval."
    },
    
    tabs: {
      info: "Quiz Info",
      questions: "Questions",
      settings: "Settings"
    },
    
    labels: {
      title: "Quiz Title",
      description: "Description",
      category: "Category",
      difficulty: "Difficulty",
      timeLimit: "Time Limit (minutes)",
      passingScore: "Passing Score (%)",
      tags: "Tags",
      status: "Status"
    },
    
    buttons: {
      back: "Back",
      save: "Save Changes",
      saving: "Saving...",
      addQuestion: "Add Question"
    }
  }
};

const enPath = path.join(localesDir, 'en', 'common.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
enData.editQuiz = enKeys.editQuiz;

// Add missing categories  
if (!enData.categories) enData.categories = {};
enData.categories.general = 'General';
enData.categories.math = 'Mathematics';
enData.categories.technology = 'Technology';
enData.categories.food = 'Food & Cuisine';

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf-8');

console.log('✅ Added EditQuizPageAdvanced translation keys!');
console.log('📦 Added editQuiz.* keys with interpolation for {{title}}');
console.log('⚠️  Note: Categories and difficulties will use existing quiz.categories.* and quiz.difficulty.* keys');
