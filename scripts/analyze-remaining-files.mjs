import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportPath = path.join(__dirname, '..', 'i18n-deep-scan-report.json');
const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const completedFiles = [
  'AdminQuizManagement.tsx',
  'AdvancedFileUpload.tsx', 
  'ResourcesStep.tsx',
  'EditQuizPageAdvanced.tsx'
];

// Get all files with counts
const allFiles = Object.entries(data.findings)
  .map(([file, findings]) => ({
    file: file.split('\\').pop(),
    fullPath: file,
    count: findings.length,
    findings: findings
  }))
  .filter(f => !completedFiles.includes(f.file))
  .sort((a, b) => b.count - a.count);

console.log('📊 PHÂN TÍCH 106 FILES CÒN LẠI:\n');

// Top 20 files
console.log('🔝 TOP 20 FILES (Priority for manual fixing):');
allFiles.slice(0, 20).forEach((f, i) => {
  const types = f.findings.reduce((acc, finding) => {
    acc[finding.type] = (acc[finding.type] || 0) + 1;
    return acc;
  }, {});
  console.log(`${i+1}. ${f.file.padEnd(40)} - ${f.count} strings (VI: ${types.vietnamese || 0}, EN: ${types.english || 0})`);
});

// Distribution by string count
console.log('\n📈 PHÂN BỐ THEO SỐ LƯỢNG STRINGS:');
const ranges = {
  '1-2': { count: 0, files: [], totalStrings: 0 },
  '3-5': { count: 0, files: [], totalStrings: 0 },
  '6-10': { count: 0, files: [], totalStrings: 0 },
  '11-15': { count: 0, files: [], totalStrings: 0 },
  '16-20': { count: 0, files: [], totalStrings: 0 },
  '21+': { count: 0, files: [], totalStrings: 0 }
};

allFiles.forEach(f => {
  if (f.count <= 2) {
    ranges['1-2'].count++;
    ranges['1-2'].files.push(f.file);
    ranges['1-2'].totalStrings += f.count;
  } else if (f.count <= 5) {
    ranges['3-5'].count++;
    ranges['3-5'].files.push(f.file);
    ranges['3-5'].totalStrings += f.count;
  } else if (f.count <= 10) {
    ranges['6-10'].count++;
    ranges['6-10'].files.push(f.file);
    ranges['6-10'].totalStrings += f.count;
  } else if (f.count <= 15) {
    ranges['11-15'].count++;
    ranges['11-15'].files.push(f.file);
    ranges['11-15'].totalStrings += f.count;
  } else if (f.count <= 20) {
    ranges['16-20'].count++;
    ranges['16-20'].files.push(f.file);
    ranges['16-20'].totalStrings += f.count;
  } else {
    ranges['21+'].count++;
    ranges['21+'].files.push(f.file);
    ranges['21+'].totalStrings += f.count;
  }
});

Object.entries(ranges).forEach(([range, data]) => {
  console.log(`  ${range.padEnd(8)} strings: ${String(data.count).padStart(3)} files (${data.totalStrings} strings total)`);
});

// File type breakdown
console.log('\n📁 PHÂN BỐ THEO LOẠI FILE:');
const fileTypes = {};
allFiles.forEach(f => {
  const ext = f.file.split('.').pop();
  if (!fileTypes[ext]) fileTypes[ext] = { count: 0, totalStrings: 0 };
  fileTypes[ext].count++;
  fileTypes[ext].totalStrings += f.count;
});

Object.entries(fileTypes)
  .sort((a, b) => b[1].totalStrings - a[1].totalStrings)
  .forEach(([ext, data]) => {
    console.log(`  .${ext.padEnd(6)} - ${String(data.count).padStart(3)} files, ${data.totalStrings} strings`);
  });

// Strategy recommendations
console.log('\n💡 CHIẾN LƯỢC XỬ LÝ:');
console.log('\n1️⃣  GROUP A - Console.log & Debug (AUTO-SKIP):');
console.log(`   Files with mostly console.log/debug messages`);
const debugFiles = allFiles.filter(f => 
  f.findings.some(finding => 
    finding.fullLine.includes('console.log') || 
    finding.fullLine.includes('console.error') ||
    finding.fullLine.includes('console.warn')
  )
);
console.log(`   → ${debugFiles.length} files có debug messages (có thể bỏ qua)`);

console.log('\n2️⃣  GROUP B - Nhỏ (1-5 strings) - BATCH PROCESSING:');
console.log(`   → ${ranges['1-2'].count + ranges['3-5'].count} files, ${ranges['1-2'].totalStrings + ranges['3-5'].totalStrings} strings`);
console.log(`   → Tạo 1 script generic để xử lý hàng loạt`);

console.log('\n3️⃣  GROUP C - Trung bình (6-20 strings) - MANUAL:');
console.log(`   → ${ranges['6-10'].count + ranges['11-15'].count + ranges['16-20'].count} files, ${ranges['6-10'].totalStrings + ranges['11-15'].totalStrings + ranges['16-20'].totalStrings} strings`);
console.log(`   → Xử lý từng file như pattern hiện tại`);

console.log('\n4️⃣  GROUP D - Lớn (21+ strings) - HIGH PRIORITY:');
console.log(`   → ${ranges['21+'].count} files, ${ranges['21+'].totalStrings} strings`);
console.log(`   → Ưu tiên cao, xử lý trước tiên`);

// Export batch files for processing
const batchFiles = allFiles.filter(f => f.count <= 5 && f.count >= 1);
fs.writeFileSync(
  path.join(__dirname, 'batch-files-list.json'),
  JSON.stringify(batchFiles, null, 2)
);
console.log(`\n✅ Đã export danh sách ${batchFiles.length} files nhỏ vào batch-files-list.json`);

// Top priority list
const topPriority = allFiles.slice(0, 20);
fs.writeFileSync(
  path.join(__dirname, 'top-priority-files.json'),
  JSON.stringify(topPriority, null, 2)
);
console.log(`✅ Đã export ${topPriority.length} files ưu tiên cao vào top-priority-files.json`);

console.log('\n📊 TỔNG KẾT:');
console.log(`   Total remaining: ${allFiles.length} files`);
console.log(`   Total strings: ${allFiles.reduce((sum, f) => sum + f.count, 0)}`);
console.log(`   Completed: 4 files, 140 strings (14.6%)`);
console.log(`   Remaining: ${allFiles.reduce((sum, f) => sum + f.count, 0)} strings (85.4%)`);
