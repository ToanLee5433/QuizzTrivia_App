#!/usr/bin/env node

/**
 * Auto I18n Fixer
 * Automatically fixes hardcoded strings in React components
 */

import fs from 'fs';
import path from 'path';

// Mapping common Vietnamese phrases to translation keys
const translationMap = {
  // Navigation
  "Quay lại": "common.back",
  "Quay lại My Quizzes": "quiz.backToMyQuizzes",
  "Không tìm thấy quiz": "quiz.notFound",
  
  // Quiz types
  "Password": "quiz.password",
  "With Materials": "quiz.withMaterials",
  
  // Actions
  "Xem Quiz": "quiz.view",
  "Xuất báo cáo": "stats.exportReport",
  
  // Time ranges
  "7 ngày qua": "stats.last7Days",
  "30 ngày qua": "stats.last30Days",
  "Tất cả thời gian": "stats.allTime",
  
  // Stats labels
  "Lượt xem": "stats.views",
  "Lượt làm bài": "stats.attempts",
  "Tỷ lệ hoàn thành": "stats.completionRate",
  "Điểm trung bình": "stats.averageScore",
  "Tỷ lệ đạt (≥60%)": "stats.passRate",
  "Điểm cao nhất": "stats.highestScore",
  "Thời gian TB": "stats.averageTime",
  "Hoàn thành": "stats.completed",
  
  // Chart titles
  "Xu hướng làm bài theo ngày": "stats.dailyTrend",
  "Phân bố điểm số": "stats.scoreDistribution",
  "Độ khó câu hỏi (Top 10 khó nhất)": "stats.questionDifficulty",
  "Top 10 học viên xuất sắc": "stats.topPerformers",
  "20 kết quả gần nhất": "stats.recentResults",
  
  // Table headers
  "Học viên": "stats.student",
  "Điểm": "stats.score",
  "Đúng/Tổng": "stats.correctTotal",
  "Thời gian": "stats.time",
  "Ngày làm": "stats.date",
  "Kết quả": "stats.result",
  
  // Status
  "Đạt": "stats.passed",
  "Chưa đạt": "stats.failed",
  "Chưa có dữ liệu": "common.noData",
  "Chưa có dữ liệu phân tích câu hỏi": "stats.noQuestionData",
  "Chưa có kết quả nào": "stats.noResults",
  
  // Dynamic texts with variables
  "câu hỏi": "stats.questions",
  "Câu": "stats.question",
};

// English translations
const translationsVi = {
  quiz: {
    backToMyQuizzes: "Quay lại My Quizzes",
    notFound: "Không tìm thấy quiz",
    password: "Password",
    withMaterials: "With Materials",
    view: "Xem Quiz",
    questions: "câu hỏi"
  },
  stats: {
    exportReport: "Xuất báo cáo",
    last7Days: "7 ngày qua",
    last30Days: "30 ngày qua",
    allTime: "Tất cả thời gian",
    views: "Lượt xem",
    attempts: "Lượt làm bài",
    completionRate: "Tỷ lệ hoàn thành",
    averageScore: "Điểm trung bình",
    passRate: "Tỷ lệ đạt (≥60%)",
    highestScore: "Điểm cao nhất",
    averageTime: "Thời gian TB",
    completed: "Hoàn thành",
    dailyTrend: "Xu hướng làm bài theo ngày",
    scoreDistribution: "Phân bố điểm số",
    questionDifficulty: "Độ khó câu hỏi (Top 10 khó nhất)",
    topPerformers: "Top 10 học viên xuất sắc",
    recentResults: "20 kết quả gần nhất",
    student: "Học viên",
    score: "Điểm",
    correctTotal: "Đúng/Tổng",
    time: "Thời gian",
    date: "Ngày làm",
    result: "Kết quả",
    passed: "Đạt",
    failed: "Chưa đạt",
    noQuestionData: "Chưa có dữ liệu phân tích câu hỏi",
    noResults: "Chưa có kết quả nào",
    question: "Câu"
  },
  common: {
    back: "Quay lại",
    noData: "Chưa có dữ liệu"
  }
};

const translationsEn = {
  quiz: {
    backToMyQuizzes: "Back to My Quizzes",
    notFound: "Quiz not found",
    password: "Password",
    withMaterials: "With Materials",
    view: "View Quiz",
    questions: "questions"
  },
  stats: {
    exportReport: "Export Report",
    last7Days: "Last 7 days",
    last30Days: "Last 30 days",
    allTime: "All time",
    views: "Views",
    attempts: "Attempts",
    completionRate: "Completion Rate",
    averageScore: "Average Score",
    passRate: "Pass Rate (≥60%)",
    highestScore: "Highest Score",
    averageTime: "Avg Time",
    completed: "Completed",
    dailyTrend: "Daily Attempt Trend",
    scoreDistribution: "Score Distribution",
    questionDifficulty: "Question Difficulty (Top 10 Hardest)",
    topPerformers: "Top 10 Performers",
    recentResults: "20 Recent Results",
    student: "Student",
    score: "Score",
    correctTotal: "Correct/Total",
    time: "Time",
    date: "Date",
    result: "Result",
    passed: "Passed",
    failed: "Failed",
    noQuestionData: "No question analysis data",
    noResults: "No results yet",
    question: "Question"
  },
  common: {
    back: "Back",
    noData: "No data"
  }
};

function fixFile(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;
  
  // Check if file already has useTranslation
  const hasTranslation = /useTranslation/.test(content);
  
  if (!hasTranslation) {
    // Add import if needed
    if (/^import React/.test(content)) {
      content = content.replace(
        /(import React[^;]+;)/,
        "$1\nimport { useTranslation } from 'react-i18next';"
      );
      console.log('  ✅ Added useTranslation import');
    }
    
    // Add hook in component
    const componentMatch = content.match(/^(export\s+)?(const|function)\s+\w+.*=.*\{\s*$/m);
    if (componentMatch) {
      const insertPoint = componentMatch.index + componentMatch[0].length;
      content = content.slice(0, insertPoint) + 
                "\n  const { t } = useTranslation();" +
                content.slice(insertPoint);
      console.log('  ✅ Added useTranslation hook');
    }
  }
  
  // Replace hardcoded strings
  for (const [text, key] of Object.entries(translationMap)) {
    // Escape special regex characters
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern 1: <tag>Text</tag>
    const pattern1 = new RegExp(`>\\s*${escapedText}\\s*<`, 'g');
    if (pattern1.test(content)) {
      content = content.replace(pattern1, `>{t('${key}')}<`);
      changes++;
    }
    
    // Pattern 2: "Text" or 'Text'
    const pattern2 = new RegExp(`["']${escapedText}["']`, 'g');
    if (pattern2.test(content)) {
      content = content.replace(pattern2, `{t('${key}')}`);
      changes++;
    }
  }
  
  // Handle dynamic strings with variables
  // Example: {quiz.questions.length} câu hỏi -> {t('stats.questionsCount', { count: quiz.questions.length })}
  content = content.replace(
    /\{([^}]+)\}\s+câu hỏi/g,
    "{t('stats.questionsCount', { count: $1 })}"
  );
  
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Fixed ${changes} strings`);
    return changes;
  } else {
    console.log('  ℹ️  No changes needed');
    return 0;
  }
}

function updateTranslationFiles() {
  const viPath = 'public/locales/vi/common.json';
  const enPath = 'public/locales/en/common.json';
  
  console.log('\n📚 Updating translation files...');
  
  // Update Vietnamese
  const viContent = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
  Object.assign(viContent, translationsVi);
  fs.writeFileSync(viPath, JSON.stringify(viContent, null, 2), 'utf-8');
  console.log('  ✅ Updated Vietnamese translations');
  
  // Update English
  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  Object.assign(enContent, translationsEn);
  fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf-8');
  console.log('  ✅ Updated English translations');
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node auto-i18n-fixer.mjs <file-path>');
  process.exit(1);
}

const targetFile = args[0];
if (!fs.existsSync(targetFile)) {
  console.error(`❌ File not found: ${targetFile}`);
  process.exit(1);
}

console.log('🚀 Auto I18n Fixer');
console.log('==================\n');

// Update translation files first
updateTranslationFiles();

// Fix the target file
const totalChanges = fixFile(targetFile);

console.log('\n✨ Done!');
console.log(`📊 Total changes: ${totalChanges}`);
