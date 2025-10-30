#!/usr/bin/env node

/**
 * ✅ Script kiểm tra cấu hình i18n để fix các lỗi phổ biến:
 * 
 * 1. Kiểm tra đường dẫn: public/locales/<lng>/<namespace>.json
 * 2. Validate JSON syntax (dấu phẩy, ngoặc)
 * 3. Kiểm tra namespace config
 * 4. So sánh keys giữa VI/EN (missing keys)
 * 5. Kiểm tra interpolation syntax {{variable}}
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configuration
const LOCALES_DIR = path.join(rootDir, 'public', 'locales');
const SUPPORTED_LANGUAGES = ['vi', 'en'];
const NAMESPACES = ['common'];

let hasErrors = false;

console.log('🔍 Validating i18n configuration...\n');

// 1. Check directory structure
console.log('📁 Checking directory structure...');
SUPPORTED_LANGUAGES.forEach(lng => {
  const lngDir = path.join(LOCALES_DIR, lng);
  if (!fs.existsSync(lngDir)) {
    console.error(`❌ Missing directory: public/locales/${lng}/`);
    hasErrors = true;
  } else {
    console.log(`✅ Directory exists: public/locales/${lng}/`);
  }
});
console.log();

// 2. Validate JSON files
console.log('📝 Validating JSON files...');
const translations = {};

SUPPORTED_LANGUAGES.forEach(lng => {
  translations[lng] = {};
  
  NAMESPACES.forEach(ns => {
    const filePath = path.join(LOCALES_DIR, lng, `${ns}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing file: public/locales/${lng}/${ns}.json`);
      hasErrors = true;
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      translations[lng][ns] = data;
      console.log(`✅ Valid JSON: public/locales/${lng}/${ns}.json (${Object.keys(data).length} top-level keys)`);
    } catch (error) {
      console.error(`❌ Invalid JSON in public/locales/${lng}/${ns}.json:`);
      console.error(`   ${error.message}`);
      hasErrors = true;
    }
  });
});
console.log();

// 3. Check for missing keys between languages
console.log('🔑 Checking for missing keys...');

function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

NAMESPACES.forEach(ns => {
  if (!translations['vi']?.[ns] || !translations['en']?.[ns]) {
    return;
  }
  
  const viKeys = new Set(getAllKeys(translations['vi'][ns]));
  const enKeys = new Set(getAllKeys(translations['en'][ns]));
  
  const missingInVi = [...enKeys].filter(key => !viKeys.has(key));
  const missingInEn = [...viKeys].filter(key => !enKeys.has(key));
  
  if (missingInVi.length > 0) {
    console.error(`❌ Keys missing in VI (namespace: ${ns}):`);
    missingInVi.slice(0, 10).forEach(key => console.error(`   - ${key}`));
    if (missingInVi.length > 10) {
      console.error(`   ... and ${missingInVi.length - 10} more`);
    }
    hasErrors = true;
  }
  
  if (missingInEn.length > 0) {
    console.error(`❌ Keys missing in EN (namespace: ${ns}):`);
    missingInEn.slice(0, 10).forEach(key => console.error(`   - ${key}`));
    if (missingInEn.length > 10) {
      console.error(`   ... and ${missingInEn.length - 10} more`);
    }
    hasErrors = true;
  }
  
  if (missingInVi.length === 0 && missingInEn.length === 0) {
    console.log(`✅ All keys match between VI and EN (namespace: ${ns})`);
  }
});
console.log();

// 4. Check interpolation syntax
console.log('🔤 Checking interpolation syntax...');

function checkInterpolation(obj, lng, ns, prefix = '') {
  let issues = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      // Check for common interpolation mistakes
      // Single braces {name} or template literals ${name} are wrong
      const wrongSingleBrace = value.match(/(?<!\{)\{(\w+)\}(?!\})/g);
      const wrongTemplateLiteral = value.match(/\$\{(\w+)\}/g);
      
      if (wrongSingleBrace) {
        issues.push(`⚠️  ${lng}/${ns}: "${fullKey}" uses {name} syntax. Should be {{name}}`);
      }
      if (wrongTemplateLiteral) {
        issues.push(`⚠️  ${lng}/${ns}: "${fullKey}" uses \${name} syntax. Should be {{name}}`);
      }
      
      // Extract all interpolation variables (correct syntax)
      const matches = value.match(/\{\{(\w+)\}\}/g);
      if (matches) {
        const vars = matches.map(m => m.slice(2, -2));
        // Just log for info
        console.log(`   ✓ ${lng}/${ns}.${fullKey}: uses variables: ${vars.join(', ')}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      issues = issues.concat(checkInterpolation(value, lng, ns, fullKey));
    }
  }
  
  return issues;
}

SUPPORTED_LANGUAGES.forEach(lng => {
  NAMESPACES.forEach(ns => {
    if (translations[lng]?.[ns]) {
      const issues = checkInterpolation(translations[lng][ns], lng, ns);
      issues.forEach(issue => {
        console.error(issue);
        hasErrors = true;
      });
    }
  });
});

if (!hasErrors) {
  console.log('✅ All interpolation syntax looks good!');
}
console.log();

// 5. Check i18n config file
console.log('⚙️  Checking i18n configuration...');
const i18nConfigPath = path.join(rootDir, 'src', 'lib', 'i18n', 'index.ts');

if (fs.existsSync(i18nConfigPath)) {
  const configContent = fs.readFileSync(i18nConfigPath, 'utf8');
  
  // Check for supported languages
  const hasViConfig = configContent.includes("'vi'") || configContent.includes('"vi"');
  const hasEnConfig = configContent.includes("'en'") || configContent.includes('"en"');
  
  if (hasViConfig && hasEnConfig) {
    console.log('✅ i18n config includes both VI and EN languages');
  } else {
    console.error('❌ i18n config missing language configuration');
    if (!hasViConfig) console.error('   - Missing: vi');
    if (!hasEnConfig) console.error('   - Missing: en');
    hasErrors = true;
  }
  
  // Check backend loadPath
  if (configContent.includes("loadPath: '/locales/{{lng}}/{{ns}}.json'")) {
    console.log('✅ Backend loadPath correctly configured');
  } else {
    console.error("❌ Backend loadPath might be incorrect. Should be: '/locales/{{lng}}/{{ns}}.json'");
    hasErrors = true;
  }
  
  // Check namespace configuration
  if (configContent.includes("ns: ['common']") || configContent.includes('ns: ["common"]')) {
    console.log('✅ Namespace configuration looks good');
  } else {
    console.error("⚠️  Namespace configuration might need attention");
  }
} else {
  console.error('❌ i18n config file not found at src/lib/i18n/index.ts');
  hasErrors = true;
}
console.log();

// Summary
if (hasErrors) {
  console.error('❌ Validation failed! Please fix the errors above.\n');
  process.exit(1);
} else {
  console.log('✅ All i18n validations passed!\n');
  console.log('📊 Summary:');
  console.log(`   - Languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  console.log(`   - Namespaces: ${NAMESPACES.join(', ')}`);
  
  NAMESPACES.forEach(ns => {
    if (translations['vi']?.[ns]) {
      const viKeys = getAllKeys(translations['vi'][ns]);
      console.log(`   - VI/${ns}: ${viKeys.length} keys`);
    }
    if (translations['en']?.[ns]) {
      const enKeys = getAllKeys(translations['en'][ns]);
      console.log(`   - EN/${ns}: ${enKeys.length} keys`);
    }
  });
  
  process.exit(0);
}
