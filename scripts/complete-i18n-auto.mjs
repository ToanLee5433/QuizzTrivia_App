#!/usr/bin/env node

/**
 * Complete i18n Automation Script
 * Automatically scans codebase, extracts strings, and creates complete translation files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  sourceDir: path.join(__dirname, '../src'),
  localesDir: path.join(__dirname, '../public/locales'),
  languages: ['vi', 'en'],
  defaultLanguage: 'vi',
  excludePaths: ['node_modules', 'dist', 'build', '.git'],
  fileExtensions: ['.tsx', '.ts', '.jsx', '.js'],
};

// Translation dictionary for common patterns
const translationDict = {
  // Common actions
  'Đăng nhập': 'Login',
  'Đăng ký': 'Register',
  'Đăng xuất': 'Logout',
  'Quên mật khẩu': 'Forgot password',
  'Đổi mật khẩu': 'Change password',
  'Cập nhật': 'Update',
  'Xóa': 'Delete',
  'Chỉnh sửa': 'Edit',
  'Lưu': 'Save',
  'Hủy': 'Cancel',
  'Xác nhận': 'Confirm',
  'Gửi': 'Submit',
  'Tìm kiếm': 'Search',
  'Lọc': 'Filter',
  'Sắp xếp': 'Sort by',
  'Tải lên': 'Upload',
  'Tải xuống': 'Download',
  'Xem': 'View',
  'Xem chi tiết': 'View details',
  'Quay lại': 'Back',
  'Tiếp theo': 'Next',
  'Hoàn thành': 'Complete',
  'Bắt đầu': 'Start',
  'Kết thúc': 'Finish',
  
  // Quiz related
  'Quiz': 'Quiz',
  'Câu hỏi': 'Question',
  'Câu trả lời': 'Answer',
  'Đáp án': 'Answer',
  'Đáp án đúng': 'Correct answer',
  'Tạo quiz': 'Create quiz',
  'Danh sách quiz': 'Quiz list',
  'Làm quiz': 'Take quiz',
  'Kết quả': 'Result',
  'Điểm': 'Score',
  'Thời gian': 'Time',
  'Độ khó': 'Difficulty',
  'Chủ đề': 'Category',
  'Mô tả': 'Description',
  'Tiêu đề': 'Title',
  'Tên quiz': 'Quiz name',
  
  // Learning resources
  'Tài liệu học tập': 'Learning resources',
  'Tài liệu': 'Resources',
  'Bài giảng': 'Lecture',
  'Video': 'Video',
  'Âm thanh': 'Audio',
  'Hình ảnh': 'Image',
  'PDF': 'PDF',
  'Liên kết': 'Link',
  'URL': 'URL',
  'Bắt buộc': 'Required',
  'Không bắt buộc': 'Optional',
  'Xem tài liệu': 'View material',
  'Thêm tài liệu': 'Add resource',
  
  // User & Profile
  'Người dùng': 'User',
  'Hồ sơ': 'Profile',
  'Thông tin': 'Information',
  'Tên': 'Name',
  'Email': 'Email',
  'Số điện thoại': 'Phone',
  'Địa chỉ': 'Address',
  'Vai trò': 'Role',
  'Quyền': 'Permission',
  
  // Admin
  'Quản trị': 'Admin',
  'Bảng điều khiển': 'Dashboard',
  'Thống kê': 'Statistics',
  'Quản lý người dùng': 'User management',
  'Quản lý quiz': 'Quiz management',
  'Phê duyệt': 'Approve',
  'Từ chối': 'Reject',
  
  // Status & State
  'Đang tải': 'Loading',
  'Đang xử lý': 'Processing',
  'Thành công': 'Success',
  'Lỗi': 'Error',
  'Cảnh báo': 'Warning',
  'Thông báo': 'Notification',
  'Chờ phê duyệt': 'Pending approval',
  'Đã phê duyệt': 'Approved',
  'Đã từ chối': 'Rejected',
  'Hoạt động': 'Active',
  'Không hoạt động': 'Inactive',
  
  // Time
  'Ngày': 'Date',
  'Giờ': 'Time',
  'Phút': 'Minute',
  'Giây': 'Second',
  'Hôm nay': 'Today',
  'Hôm qua': 'Yesterday',
  'Tuần này': 'This week',
  'Tháng này': 'This month',
  
  // Messages
  'Bạn có chắc chắn': 'Are you sure',
  'Không thể hoàn tác': 'Cannot be undone',
  'Vui lòng nhập': 'Please enter',
  'Vui lòng chọn': 'Please select',
  'Không có dữ liệu': 'No data',
  'Không tìm thấy': 'Not found',
  'Đã xảy ra lỗi': 'An error occurred',
  
  // Numbers & Counts
  'Tất cả': 'All',
  'Không có': 'None',
  'Có': 'Yes',
  'Không': 'No',
};

class I18nCompleter {
  constructor() {
    this.viTranslations = {};
    this.enTranslations = {};
    this.hardcodedStrings = new Set();
    this.existingKeys = new Set();
  }

  // Load existing translations
  loadExistingTranslations() {
    console.log('\n📖 Loading existing translations...');
    
    const viPath = path.join(config.localesDir, 'vi', 'common.json');
    const enPath = path.join(config.localesDir, 'en', 'common.json');
    
    if (fs.existsSync(viPath)) {
      this.viTranslations = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
      this.extractKeys(this.viTranslations);
      console.log(`✓ Loaded ${this.existingKeys.size} Vietnamese keys`);
    }
    
    if (fs.existsSync(enPath)) {
      this.enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
      console.log(`✓ Loaded English translations`);
    }
  }

  // Extract all keys from nested object
  extractKeys(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      this.existingKeys.add(fullKey);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractKeys(value, fullKey);
      }
    }
  }

  // Scan files for hardcoded strings
  scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!config.excludePaths.includes(entry.name)) {
          this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (config.fileExtensions.includes(ext)) {
          this.scanFile(fullPath);
        }
      }
    }
  }

  // Scan individual file for Vietnamese strings
  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Patterns to find Vietnamese strings
    const patterns = [
      // JSX/HTML text content
      />([^<>{}]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][^<>{}]*)</gi,
      // String literals (single/double quotes)
      /["']([^"']*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][^"']*)["']/g,
      // Template literals
      /`([^`]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][^`]*)`/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const str = match[1].trim();
        if (str && !this.shouldExclude(str)) {
          this.hardcodedStrings.add(str);
        }
      }
    }
  }

  // Check if string should be excluded
  shouldExclude(str) {
    // Exclude empty, too short, or special strings
    if (str.length < 2) return true;
    if (/^[\d\s\-_.,!?]+$/.test(str)) return true; // Only numbers/punctuation
    if (/^[a-zA-Z0-9\s]+$/.test(str) && str.length < 4) return true; // Short English
    if (str.includes('{{') || str.includes('}}')) return true; // Template variables
    if (str.startsWith('src=') || str.startsWith('href=')) return true; // Attributes
    if (str.includes('http://') || str.includes('https://')) return true; // URLs
    
    return false;
  }

  // Generate translation key from Vietnamese string
  generateKey(viText) {
    // Remove diacritics and convert to camelCase
    let key = viText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    // Truncate if too long
    if (key.length > 50) {
      key = key.substring(0, 50);
    }
    
    return key;
  }

  // Translate Vietnamese to English
  translateToEnglish(viText) {
    // Check dictionary first
    if (translationDict[viText]) {
      return translationDict[viText];
    }
    
    // Basic word-by-word translation for common patterns
    let enText = viText;
    
    for (const [vi, en] of Object.entries(translationDict)) {
      const regex = new RegExp(vi, 'gi');
      enText = enText.replace(regex, en);
    }
    
    // If no translation found, keep original
    if (enText === viText) {
      return viText; // Will be manually translated later
    }
    
    return enText;
  }

  // Process hardcoded strings and add to translations
  processHardcodedStrings() {
    console.log(`\n🔍 Found ${this.hardcodedStrings.size} hardcoded strings`);
    console.log('📝 Processing new translations...');
    
    let newKeysCount = 0;
    const sortedStrings = Array.from(this.hardcodedStrings).sort();
    
    for (const viText of sortedStrings) {
      const key = this.generateKey(viText);
      
      // Skip if key already exists
      if (this.existingKeys.has(key)) {
        continue;
      }
      
      // Add to translations
      this.viTranslations[key] = viText;
      this.enTranslations[key] = this.translateToEnglish(viText);
      this.existingKeys.add(key);
      newKeysCount++;
      
      console.log(`  + ${key}: "${viText}" → "${this.enTranslations[key]}"`);
    }
    
    console.log(`\n✓ Added ${newKeysCount} new translation keys`);
  }

  // Clean up backup files
  cleanupBackups() {
    console.log('\n🧹 Cleaning up duplicate files...');
    
    const viDir = path.join(config.localesDir, 'vi');
    const enDir = path.join(config.localesDir, 'en');
    
    const backupFiles = [
      path.join(viDir, 'common.backup.json'),
      path.join(viDir, 'common_fixed.json'),
      path.join(enDir, 'common_fixed.json'),
    ];
    
    for (const file of backupFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`  ✓ Deleted: ${path.basename(file)}`);
      }
    }
  }

  // Sort object keys recursively
  sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return obj;
    }
    
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }
    
    return sorted;
  }

  // Save translations
  saveTranslations() {
    console.log('\n💾 Saving translations...');
    
    // Sort keys alphabetically
    const sortedVi = this.sortObjectKeys(this.viTranslations);
    const sortedEn = this.sortObjectKeys(this.enTranslations);
    
    // Save Vietnamese
    const viPath = path.join(config.localesDir, 'vi', 'common.json');
    fs.writeFileSync(viPath, JSON.stringify(sortedVi, null, 2), 'utf-8');
    console.log(`  ✓ Saved Vietnamese: ${viPath}`);
    
    // Save English
    const enPath = path.join(config.localesDir, 'en', 'common.json');
    fs.writeFileSync(enPath, JSON.stringify(sortedEn, null, 2), 'utf-8');
    console.log(`  ✓ Saved English: ${enPath}`);
    
    // Generate report
    this.generateReport();
  }

  // Generate completion report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalKeys: this.existingKeys.size,
      languages: {
        vi: {
          file: 'public/locales/vi/common.json',
          keys: Object.keys(this.viTranslations).length,
        },
        en: {
          file: 'public/locales/en/common.json',
          keys: Object.keys(this.enTranslations).length,
        },
      },
      hardcodedStringsFound: this.hardcodedStrings.size,
      coverage: {
        percentage: ((this.existingKeys.size / Math.max(this.hardcodedStrings.size, 1)) * 100).toFixed(2) + '%',
      },
    };
    
    const reportPath = path.join(__dirname, 'i18n-completion-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log('\n📊 Translation Report:');
    console.log(`  Total keys: ${report.totalKeys}`);
    console.log(`  Vietnamese keys: ${report.languages.vi.keys}`);
    console.log(`  English keys: ${report.languages.en.keys}`);
    console.log(`  Hardcoded strings found: ${report.hardcodedStringsFound}`);
    console.log(`  Coverage: ${report.coverage.percentage}`);
    console.log(`\n  Report saved: ${reportPath}`);
  }

  // Main execution
  async run() {
    console.log('🚀 Starting i18n Completion Script...\n');
    console.log('=' .repeat(60));
    
    try {
      // Step 1: Load existing translations
      this.loadExistingTranslations();
      
      // Step 2: Scan codebase
      console.log('\n🔎 Scanning codebase for hardcoded strings...');
      this.scanDirectory(config.sourceDir);
      
      // Step 3: Process new strings
      this.processHardcodedStrings();
      
      // Step 4: Clean up backups
      this.cleanupBackups();
      
      // Step 5: Save everything
      this.saveTranslations();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ i18n completion finished successfully!');
      console.log('\n📝 Next steps:');
      console.log('  1. Review translations in public/locales/');
      console.log('  2. Replace hardcoded strings with t() calls');
      console.log('  3. Test language switching in the app');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run the script
const completer = new I18nCompleter();
completer.run();
