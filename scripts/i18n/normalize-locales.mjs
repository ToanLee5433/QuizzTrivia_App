#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOCALES_DIR = path.resolve(PROJECT_ROOT, 'public', 'locales');

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function setDeep(target, keyPath, value) {
  const parts = keyPath.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in cursor) || typeof cursor[part] !== 'object' || cursor[part] === null) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function unflattenObject(flatMap) {
  const result = {};
  for (const [key, value] of Object.entries(flatMap)) {
    setDeep(result, key, value);
  }
  return result;
}

async function normalize() {
  const viPath = path.join(LOCALES_DIR, 'vi', 'common.json');
  const enPath = path.join(LOCALES_DIR, 'en', 'common.json');
  const enFixedPath = path.join(LOCALES_DIR, 'en', 'common_fixed.json');

  const vi = await fs.readJSON(viPath);

  // Try to read en/common.json. If it's invalid, fall back to {}.
  let enRaw = {};
  try {
    enRaw = await fs.readJSON(enPath);
  } catch {
    enRaw = {};
  }

  const enFixed = await fs.readJSON(enFixedPath).catch(() => ({}));

  // Remove duplicate groups from enRaw if present by merging into canonical groups first
  if (enRaw.uiDuplicate && typeof enRaw.uiDuplicate === 'object') {
    enRaw.ui = enRaw.ui || {};
    enRaw.ui = { ...enRaw.ui, ...enRaw.uiDuplicate };
    delete enRaw.uiDuplicate;
  }
  if (enRaw.quizDuplicateToRemove && typeof enRaw.quizDuplicateToRemove === 'object') {
    enRaw.quiz = enRaw.quiz || {};
    enRaw.quiz = { ...enRaw.quiz, ...enRaw.quizDuplicateToRemove };
    delete enRaw.quizDuplicateToRemove;
  }

  const viFlat = flattenObject(vi);
  const enRawFlat = flattenObject(enRaw);
  const enFixedFlat = flattenObject(enFixed);

  // Build a clean EN map following VI structure strictly
  const newEnFlat = {};
  const preferredSources = [enRawFlat, enFixedFlat];

  for (const [key, viValue] of Object.entries(viFlat)) {
    // Skip technical or cache keys that might exist in VI
    if (key.startsWith('_')) continue;

    let enValue = undefined;
    for (const src of preferredSources) {
      if (key in src && src[key] !== undefined && src[key] !== null) {
        enValue = src[key];
        break;
      }
    }
    // Fallback: use VI text as temporary EN to avoid missing keys
    newEnFlat[key] = enValue ?? viValue;
  }

  const newEn = unflattenObject(newEnFlat);

  // Persist normalized EN file (pretty JSON)
  await fs.writeJSON(enPath, newEn, { spaces: 2 });

  // Also ensure VI has no accidental duplicate groups (defensive)
  if (vi.uiDuplicate || vi.quizDuplicateToRemove) {
    const viClone = { ...vi };
    if (viClone.uiDuplicate) {
      viClone.ui = { ...(viClone.ui || {}), ...viClone.uiDuplicate };
      delete viClone.uiDuplicate;
    }
    if (viClone.quizDuplicateToRemove) {
      viClone.quiz = { ...(viClone.quiz || {}), ...viClone.quizDuplicateToRemove };
      delete viClone.quizDuplicateToRemove;
    }
    await fs.writeJSON(viPath, viClone, { spaces: 2 });
  }

  console.log('✅ Normalized locales:');
  console.log(`- Consolidated duplicates into canonical groups and rewrote EN to match VI structure`);
  console.log(`- Output: ${path.relative(process.cwd(), enPath)}`);
}

normalize().catch((err) => {
  console.error('❌ normalize-locales failed:', err);
  process.exit(1);
});


