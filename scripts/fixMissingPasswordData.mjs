#!/usr/bin/env node

/**
 * Fix Missing Password Data Script
 * 
 * Finds quizzes that have havePassword='password' or visibility='password'
 * but are missing the pwd field (salt + hash)
 * 
 * This happens when:
 * 1. Quiz was created before the new password system
 * 2. Quiz data was corrupted or incomplete
 * 3. Password field was not saved properly
 * 
 * Solution:
 * - Remove password protection (set havePassword/visibility to 'public')
 * - Owner must re-edit quiz and set password again to generate proper pwd field
 * 
 * Usage:
 *   node scripts/fixMissingPasswordData.mjs --dry-run  (preview changes)
 *   node scripts/fixMissingPasswordData.mjs --fix      (apply changes)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldFix = args.includes('--fix');

if (!isDryRun && !shouldFix) {
  console.log('❌ Please specify --dry-run or --fix');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/fixMissingPasswordData.mjs --dry-run  (preview)');
  console.log('  node scripts/fixMissingPasswordData.mjs --fix      (apply changes)');
  process.exit(1);
}

async function findQuizzesWithMissingPassword() {
  console.log('🔍 Searching for quizzes with missing password data...\n');

  const quizzesRef = db.collection('quizzes');
  const snapshot = await quizzesRef.get();

  const problematicQuizzes = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const hasPasswordFlag = 
      data.havePassword === 'password' || 
      data.visibility === 'password';
    
    const hasPwdData = data.pwd && data.pwd.enabled && data.pwd.salt && data.pwd.hash;

    if (hasPasswordFlag && !hasPwdData) {
      problematicQuizzes.push({
        id: doc.id,
        title: data.title || 'Untitled',
        createdBy: data.createdBy || 'Unknown',
        havePassword: data.havePassword,
        visibility: data.visibility,
        pwd: data.pwd || null,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    }
  });

  return problematicQuizzes;
}

async function fixQuiz(quizId) {
  const quizRef = db.collection('quizzes').doc(quizId);
  
  await quizRef.update({
    havePassword: 'public',
    visibility: 'public',
    // Remove pwd field if it exists but is incomplete
    pwd: null
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🔧 Fix Missing Password Data - QuizTrivia App         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const problematicQuizzes = await findQuizzesWithMissingPassword();

    if (problematicQuizzes.length === 0) {
      console.log('✅ No quizzes with missing password data found!');
      console.log('   All quizzes are properly configured.');
      return;
    }

    console.log(`⚠️  Found ${problematicQuizzes.length} quiz(es) with missing password data:\n`);

    problematicQuizzes.forEach((quiz, index) => {
      console.log(`${index + 1}. Quiz: "${quiz.title}"`);
      console.log(`   ID: ${quiz.id}`);
      console.log(`   Created by: ${quiz.createdBy}`);
      console.log(`   havePassword: ${quiz.havePassword}`);
      console.log(`   visibility: ${quiz.visibility}`);
      console.log(`   pwd field: ${quiz.pwd ? 'incomplete' : 'missing'}`);
      console.log(`   Created: ${quiz.createdAt.toLocaleString()}`);
      console.log('');
    });

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log('');
      console.log('📋 Recommended action:');
      console.log('   These quizzes will be set to PUBLIC (remove password protection)');
      console.log('   Quiz owners must re-edit and set password again to generate proper pwd data');
      console.log('');
      console.log('To apply fixes, run:');
      console.log('   node scripts/fixMissingPasswordData.mjs --fix');
      return;
    }

    if (shouldFix) {
      console.log('🔧 Applying fixes...\n');

      let successCount = 0;
      let errorCount = 0;

      for (const quiz of problematicQuizzes) {
        try {
          await fixQuiz(quiz.id);
          console.log(`✅ Fixed: ${quiz.title} (${quiz.id})`);
          successCount++;
        } catch (error) {
          console.error(`❌ Error fixing ${quiz.title}:`, error.message);
          errorCount++;
        }
      }

      console.log('');
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║                    MIGRATION COMPLETE                     ║');
      console.log('╚══════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`✅ Successfully fixed: ${successCount} quiz(es)`);
      if (errorCount > 0) {
        console.log(`❌ Errors: ${errorCount} quiz(es)`);
      }
      console.log('');
      console.log('📋 Next steps:');
      console.log('   1. Notify quiz owners that password protection was removed');
      console.log('   2. Owners must re-edit quiz and set password again');
      console.log('   3. This will generate proper pwd field (salt + hash)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
