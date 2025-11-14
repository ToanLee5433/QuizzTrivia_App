#!/usr/bin/env node

/**
 * Diagnostic script to find why quiz questions are not loading
 * Run: node scripts/diagnose-quiz-questions.mjs [quizId]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 QUIZ QUESTIONS DIAGNOSTIC TOOL');
console.log('=====================================\n');

// Get quiz ID from command line or use default
const quizId = process.argv[2] || 'mGEoMyTxuttzEKxHy9CM';

console.log(`Testing quiz ID: ${quizId}\n`);

// Initialize Firebase Admin
let db;
try {
  // Try to load service account key
  const serviceAccountPaths = [
    join(__dirname, '../serviceAccountKey.json'),
    join(__dirname, '../firebase-admin-key.json'),
    join(__dirname, '../config/serviceAccountKey.json'),
  ];

  let serviceAccount = null;
  for (const path of serviceAccountPaths) {
    if (existsSync(path)) {
      console.log(`✅ Found service account key: ${path}`);
      serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
      break;
    }
  }

  if (!serviceAccount) {
    console.error('❌ Service account key not found!');
    console.log('\nPlease create one of these files:');
    serviceAccountPaths.forEach(p => console.log(`  - ${p}`));
    console.log('\nDownload from Firebase Console:');
    console.log('  Project Settings > Service Accounts > Generate New Private Key');
    process.exit(1);
  }

  initializeApp({
    credential: cert(serviceAccount)
  });

  db = getFirestore();
  console.log('✅ Connected to Firestore\n');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

// Run diagnostics
async function diagnose() {
  try {
    // Test 1: Get quiz metadata
    console.log('📋 TEST 1: Quiz Metadata');
    console.log('─────────────────────────');
    
    const quizRef = db.collection('quizzes').doc(quizId);
    const quizDoc = await quizRef.get();
    
    if (!quizDoc.exists) {
      console.error(`❌ Quiz not found: ${quizId}`);
      console.log('\n💡 Possible causes:');
      console.log('  - Wrong quiz ID');
      console.log('  - Quiz was deleted');
      console.log('  - Database rules preventing read');
      return;
    }
    
    const quizData = quizDoc.data();
    console.log('✅ Quiz found:', quizData.title);
    console.log('   Status:', quizData.status);
    console.log('   Visibility:', quizData.visibility);
    console.log('   Created by:', quizData.createdBy);
    console.log('   Created at:', quizData.createdAt?.toDate?.() || quizData.createdAt);
    
    // Check for questions field in parent doc
    const hasQuestionsField = 'questions' in quizData;
    console.log('   Has "questions" field:', hasQuestionsField);
    
    if (hasQuestionsField) {
      console.log('\n⚠️  WARNING: Found "questions" field in parent document!');
      console.log('   Type:', Array.isArray(quizData.questions) ? 'Array' : typeof quizData.questions);
      
      if (Array.isArray(quizData.questions)) {
        console.log('   Length:', quizData.questions.length);
        console.log('\n🔍 This is OLD data structure!');
        console.log('   Current code expects: quizzes/{id}/questions/{qid} (subcollection)');
        console.log('   But data is stored as: quizzes/{id}.questions[] (array field)');
        console.log('\n💥 ROOT CAUSE FOUND!');
      }
    }
    
    console.log('\n📝 TEST 2: Questions Subcollection');
    console.log('─────────────────────────────────');
    
    // Test 2: Query questions subcollection
    const questionsRef = quizRef.collection('questions');
    const questionsSnap = await questionsRef.get();
    
    console.log('Query path:', `quizzes/${quizId}/questions`);
    console.log('Result:', {
      size: questionsSnap.size,
      empty: questionsSnap.empty,
      docs: questionsSnap.docs.length
    });
    
    if (questionsSnap.empty) {
      console.error('\n❌ Subcollection is EMPTY!');
      
      if (hasQuestionsField && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
        console.log('\n🔧 SOLUTION: Migrate questions from parent doc to subcollection');
        console.log(`   - Parent doc has ${quizData.questions.length} questions`);
        console.log('   - Subcollection has 0 questions');
        console.log('   - Need to move questions to subcollection structure');
        
        console.log('\n📊 Sample questions from parent doc:');
        quizData.questions.slice(0, 3).forEach((q, i) => {
          console.log(`   Q${i+1}: ${q.questionText?.substring(0, 50)}...`);
          console.log(`       Type: ${q.type || 'multiple-choice'}`);
          console.log(`       Answers: ${q.answers?.length || q.options?.length || 0}`);
        });
        
        return {
          issue: 'STRUCTURE_MISMATCH',
          oldStructure: true,
          questionsInParent: quizData.questions.length,
          questionsInSubcollection: 0,
          needsMigration: true
        };
      } else {
        console.log('\n💡 Possible causes:');
        console.log('  - Quiz has no questions yet');
        console.log('  - Questions were deleted');
        console.log('  - Wrong subcollection name');
        
        return {
          issue: 'NO_QUESTIONS',
          oldStructure: false,
          questionsInParent: 0,
          questionsInSubcollection: 0,
          needsMigration: false
        };
      }
    } else {
      console.log(`✅ Found ${questionsSnap.size} questions in subcollection`);
      
      console.log('\n📊 Questions list:');
      questionsSnap.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`   Q${i+1} (${doc.id}):`);
        console.log(`       ${data.questionText?.substring(0, 60)}...`);
        console.log(`       Type: ${data.type || 'multiple-choice'}`);
        console.log(`       Points: ${data.points || 1}`);
      });
      
      return {
        issue: 'NONE',
        oldStructure: hasQuestionsField,
        questionsInParent: hasQuestionsField ? (quizData.questions?.length || 0) : 0,
        questionsInSubcollection: questionsSnap.size,
        needsMigration: false
      };
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    
    return {
      issue: 'ERROR',
      error: error.message
    };
  }
}

// Run and report
diagnose().then(result => {
  console.log('\n=====================================');
  console.log('🎯 DIAGNOSTIC RESULT');
  console.log('=====================================\n');
  
  console.log(JSON.stringify(result, null, 2));
  
  if (result.needsMigration) {
    console.log('\n⚠️  ACTION REQUIRED: Run migration script');
    console.log('   node scripts/migrate-questions-to-subcollection.mjs');
  } else if (result.issue === 'NONE') {
    console.log('\n✅ No issues found with data structure');
    console.log('   Problem may be in application code, not database');
  }
  
  console.log('\n');
  process.exit(result.issue === 'NONE' ? 0 : 1);
}).catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
