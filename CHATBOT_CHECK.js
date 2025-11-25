/**
 * 🔍 QUICK CHATBOT HEALTH CHECK
 * 
 * Kiểm tra nhanh các điều kiện cần thiết để chatbot hoạt động
 * Run: node CHATBOT_CHECK.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🤖 CHATBOT HEALTH CHECK\n');
console.log('='.repeat(60));

const checks = [];
let passCount = 0;
let failCount = 0;

function check(name, condition, solution) {
  const result = {
    name,
    pass: condition,
    solution
  };
  checks.push(result);
  
  if (condition) {
    passCount++;
    console.log(`✅ ${name}`);
  } else {
    failCount++;
    console.log(`❌ ${name}`);
    console.log(`   💡 ${solution}\n`);
  }
}

// 1. Check ChatbotButton exists
const chatbotButtonPath = path.join(__dirname, 'src/components/rag/ChatbotButton.tsx');
check(
  'ChatbotButton component exists',
  fs.existsSync(chatbotButtonPath),
  'File không tồn tại. Component bị xóa hoặc di chuyển.'
);

// 2. Check ChatbotModal exists
const chatbotModalPath = path.join(__dirname, 'src/components/rag/ChatbotModal.tsx');
check(
  'ChatbotModal component exists',
  fs.existsSync(chatbotModalPath),
  'File không tồn tại. Component bị xóa hoặc di chuyển.'
);

// 3. Check if ChatbotButton is imported in App.tsx
const appPath = path.join(__dirname, 'src/App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf-8');
  check(
    'ChatbotButton imported in App.tsx',
    appContent.includes("import { ChatbotButton }") || appContent.includes("from './components/rag'"),
    'Thêm: import { ChatbotButton } from "./components/rag"; vào App.tsx'
  );
  
  check(
    'ChatbotButton rendered in App.tsx',
    appContent.includes('<ChatbotButton'),
    'Thêm <ChatbotButton /> vào App component (trước </Router>)'
  );
}

// 4. Check config has correct model
const configPath = path.join(__dirname, 'src/lib/genkit/config.ts');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  check(
    'Config uses gemini-2.5-flash-lite',
    configContent.includes('gemini-2.5-flash-lite'),
    'Sửa chatModel trong src/lib/genkit/config.ts thành "gemini-2.5-flash-lite"'
  );
}

// 5. Check Cloud Functions exists
const askFunctionPath = path.join(__dirname, 'functions/src/rag/ask.ts');
check(
  'Cloud Function askRAG exists',
  fs.existsSync(askFunctionPath),
  'File functions/src/rag/ask.ts không tồn tại. Cần tạo lại.'
);

// 6. Check vector index build script
const buildScriptPath = path.join(__dirname, 'scripts/buildVectorIndex.ts');
check(
  'Vector index build script exists',
  fs.existsSync(buildScriptPath),
  'File scripts/buildVectorIndex.ts không tồn tại. Cần tạo lại.'
);

// 7. Check package.json has build:index script
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  check(
    'npm run build:index script available',
    packageJson.scripts && packageJson.scripts['build:index'],
    'Thêm script "build:index" vào package.json'
  );
}

// 8. Check QuizRecommendationCard
const quizCardPath = path.join(__dirname, 'src/components/rag/QuizRecommendationCard.tsx');
check(
  'QuizRecommendationCard component exists',
  fs.existsSync(quizCardPath),
  'File không tồn tại. Component recommendation bị xóa.'
);

console.log('\n' + '='.repeat(60));
console.log(`\n📊 SUMMARY: ${passCount} passed, ${failCount} failed\n`);

if (failCount === 0) {
  console.log('✨ All checks passed! Chatbot should work.\n');
  console.log('📝 NEXT STEPS:');
  console.log('1. Đăng nhập vào app');
  console.log('2. Build vector index: npm run build:index');
  console.log('3. Start dev server: npm run dev');
  console.log('4. Tìm button chatbot ở bottom-right corner\n');
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above.\n');
}

// Additional info
console.log('📖 DETAILED GUIDE:');
console.log('   Read: CHATBOT_TROUBLESHOOTING.md\n');
console.log('🔧 CONFIG UPDATED:');
console.log('   - Model: gemini-2.5-flash-lite');
console.log('   - Max tokens: 8192');
console.log('   - Rate limit: 100 req/min');
console.log('   - Temperature: 0.7\n');
