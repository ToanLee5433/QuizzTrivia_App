import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const viPath = path.join(projectRoot, 'public/locales/vi/common.json');
const enPath = path.join(projectRoot, 'public/locales/en/common.json');

// Vietnamese diacritics regex
const hasVietnameseDiacritics = (text) => {
  const vietnameseDiacritics = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
  return vietnameseDiacritics.test(text);
};

// Check if value is valid translation (not code)
const isValidTranslation = (value) => {
  if (typeof value === 'object') return true; // Nested object
  if (typeof value !== 'string') return false;
  
  // Skip if empty
  if (!value.trim()) return false;
  
  // Skip if looks like code (contains special patterns)
  const codePatterns = [
    /\r\n/g,              // Line breaks from code
    /className=/,       // React className
    /onClick=/,         // React onClick
    /const\s+\w+/,      // const declarations
    /return\s+/,        // return statements
    /=>|{|}|\[|\]/g,    // Arrow functions, brackets
    /case\s+\d+:/,      // Switch cases
    /\.map\(|\.filter\(/,  // Array methods
    /setState|useState/, // React hooks
  ];
  
  for (const pattern of codePatterns) {
    if (pattern.test(value)) {
      return false;
    }
  }
  
  // Must be reasonable length (not too long)
  if (value.length > 200) return false;
  
  return true;
};

// Recursively clean object
const cleanObject = (obj) => {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      // Nested object
      const cleanedNested = cleanObject(value);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else if (isValidTranslation(value)) {
      cleaned[key] = value;
    } else {
      console.log(`🗑️  Removed invalid key: "${key}" (code detected)`);
    }
  }
  
  return cleaned;
};

function cleanTranslationFiles() {
  try {
    console.log('🧹 Cleaning translation files...\n');
    
    // Read files
    const viContent = JSON.parse(fs.readFileSync(viPath, 'utf-8'));
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    
    const viKeysBefore = Object.keys(viContent).length;
    const enKeysBefore = Object.keys(enContent).length;
    
    // Clean
    console.log('📝 Vietnamese file:');
    const cleanedVi = cleanObject(viContent);
    
    console.log('\n📝 English file:');
    const cleanedEn = cleanObject(enContent);
    
    // Sort keys
    const sortedVi = Object.keys(cleanedVi).sort().reduce((acc, key) => {
      acc[key] = cleanedVi[key];
      return acc;
    }, {});
    
    const sortedEn = Object.keys(cleanedEn).sort().reduce((acc, key) => {
      acc[key] = cleanedEn[key];
      return acc;
    }, {});
    
    // Write back
    fs.writeFileSync(viPath, JSON.stringify(sortedVi, null, 2), 'utf-8');
    fs.writeFileSync(enPath, JSON.stringify(sortedEn, null, 2), 'utf-8');
    
    const viKeysAfter = Object.keys(sortedVi).length;
    const enKeysAfter = Object.keys(sortedEn).length;
    
    console.log('\n✅ Cleaning completed!');
    console.log(`   Vietnamese: ${viKeysBefore} → ${viKeysAfter} keys (removed ${viKeysBefore - viKeysAfter})`);
    console.log(`   English: ${enKeysBefore} → ${enKeysAfter} keys (removed ${enKeysBefore - enKeysAfter})`);
    
  } catch (error) {
    console.error('❌ Error cleaning files:', error);
    process.exit(1);
  }
}

cleanTranslationFiles();
