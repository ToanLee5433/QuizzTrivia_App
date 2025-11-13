#!/usr/bin/env node

/**
 * Migration script to move questions from parent document to subcollection
 * Run: node scripts/migrate-questions-to-subcollection.mjs [quizId]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

console.log('🔄 QUESTIONS MIGRATION TOOL');
console.log('=====================================\n');

// Get quiz ID from command line
const quizId = process.argv[2];

if (!quizId) {
  console.error('❌ Missing quiz ID!');
  console.log('\nUsage: node scripts/migrate-questions-to-subcollection.mjs <quizId>');
  console.log('Example: node scripts/migrate-questions-to-subcollection.mjs mGEoMyTxuttzEKxHy9CM');
  process.exit(1);
}

console.log(`Quiz ID: ${quizId}\n`);

// Initialize Firebase Admin
let db;
try {
  const serviceAccountPaths = [
    join(__dirname, '../serviceAccountKey.json'),
    join(__dirname, '../firebase-admin-key.json'),
    join(__dirname, '../config/serviceAccountKey.json'),
  ];

  let serviceAccount = null;
  for (const path of serviceAccountPaths) {
    if (existsSync(path)) {
      serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
      break;
    }
  }

  if (!serviceAccount) {
    console.error('❌ Service account key not found!');
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

async function migrate() {
  try {
    // Get quiz document
    const quizRef = db.collection('quizzes').doc(quizId);
    const quizDoc = await quizRef.get();
    
    if (!quizDoc.exists) {
      console.error(`❌ Quiz not found: ${quizId}`);
      return;
    }
    
    const quizData = quizDoc.data();
    console.log('📋 Quiz:', quizData.title);
    
    // Check if questions exist in parent doc
    if (!('questions' in quizData) || !Array.isArray(quizData.questions)) {
      console.error('❌ No questions array found in parent document');
      return;
    }
    
    const questions = quizData.questions;
    console.log(`📊 Found ${questions.length} questions in parent document\n`);
    
    // Check if subcollection already has questions
    const questionsRef = quizRef.collection('questions');
    const existingSnap = await questionsRef.get();
    
    if (!existingSnap.empty) {
      console.warn(`⚠️  Subcollection already has ${existingSnap.size} questions!`);
      const answer = await ask('Do you want to overwrite? (yes/no): ');
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled');
        rl.close();
        return;
      }
      
      // Delete existing questions
      console.log('\n🗑️  Deleting existing questions...');
      const batch = db.batch();
      existingSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('✅ Deleted old questions');
    }
    
    // Confirm migration
    console.log('\n🔄 Ready to migrate:');
    console.log(`   From: quizzes/${quizId}.questions[] (array field)`);
    console.log(`   To:   quizzes/${quizId}/questions/{id} (subcollection)`);
    console.log(`   Count: ${questions.length} questions\n`);
    
    const confirm = await ask('Proceed with migration? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Migration cancelled');
      rl.close();
      return;
    }
    
    console.log('\n📝 Migrating questions...');
    
    // Migrate in batches of 500 (Firestore limit)
    const batchSize = 500;
    let migrated = 0;
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = db.batch();
      const chunk = questions.slice(i, i + batchSize);
      
      for (const question of chunk) {
        // Generate ID or use existing
        const questionId = question.id || db.collection('_').doc().id;
        const questionRef = questionsRef.doc(questionId);
        
        // Clean up question data
        const questionData = {
          ...question,
          id: questionId,
          createdAt: question.createdAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        
        batch.set(questionRef, questionData);
        migrated++;
      }
      
      await batch.commit();
      console.log(`   ✅ Migrated ${migrated}/${questions.length} questions`);
    }
    
    console.log('\n✅ All questions migrated successfully!');
    
    // Ask if user wants to remove old questions field
    const removeOld = await ask('\nRemove old "questions" field from parent doc? (yes/no): ');
    if (removeOld.toLowerCase() === 'yes') {
      await quizRef.update({
        questions: FieldValue.delete()
      });
      console.log('✅ Removed old questions field');
    } else {
      console.log('ℹ️  Old questions field kept (for backup)');
    }
    
    console.log('\n🎉 Migration complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Migrated: ${migrated} questions`);
    console.log(`   Location: quizzes/${quizId}/questions/`);
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

migrate();
