/**
 * 🔄 Re-sync Index Script
 * 
 * Validates index consistency and rebuilds if necessary
 * Run weekly or when data inconsistencies are suspected
 * 
 * Usage:
 *   npx tsx scripts/resyncIndex.ts [--force]
 */

import { initializeApp, getApps } from 'firebase/app';
import * as admin from 'firebase-admin';
import { loadIndexFromStorage, saveIndexToStorage } from '../functions/src/lib/storageUtils';
import { buildIndex } from '../src/lib/genkit/indexing';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDtBzTHNPQ5PxKhVb-si89kgr5T_3ppwj8",
  authDomain: "datn-quizapp.firebaseapp.com",
  projectId: "datn-quizapp",
  storageBucket: "datn-quizapp.firebasestorage.app",
  messagingSenderId: "741975099365",
  appId: "1:741975099365:web:75a1d1eb4b6d89f0f7110c",
  measurementId: "G-6Y1VQMBGJ0",
  databaseURL: "https://datn-quizapp-default-rtdb.firebaseio.com"
};

const FORCE_FLAG = process.argv.includes('--force');

async function main() {
  console.log('🔍 Checking index consistency...\n');

  try {
    // Initialize Firebase
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: 'datn-quizapp.appspot.com',
      });
    }

    // Initialize client SDK for indexing
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
    }

    // Load current index
    console.log('📥 Loading index from Cloud Storage...');
    const currentIndex = await loadIndexFromStorage();

    if (!currentIndex) {
      console.log('❌ No index found in Storage');
      console.log('💡 Building new index...\n');
      
      const newIndex = await buildIndex();
      await saveIndexToStorage(newIndex);
      
      console.log('✅ New index built and uploaded');
      process.exit(0);
    }

    console.log(`✅ Loaded index: ${currentIndex.totalChunks} chunks\n`);

    // Get all approved quizzes from Firestore
    console.log('📊 Fetching approved quizzes from Firestore...');
    const quizzesSnapshot = await admin
      .firestore()
      .collection('quizzes')
      .where('status', '==', 'approved')
      .get();

    const expectedQuizIds = new Set(quizzesSnapshot.docs.map((doc) => doc.id));
    console.log(`✅ Found ${expectedQuizIds.size} approved quizzes\n`);

    // Extract quiz IDs from index
    const indexedQuizIds = new Set<string>();
    currentIndex.chunks.forEach((chunk) => {
      const match = chunk.chunkId.match(/^quiz_([^_]+)/);
      if (match) {
        indexedQuizIds.add(match[1]);
      }
    });

    console.log(`📋 Index contains ${indexedQuizIds.size} quizzes\n`);

    // Find inconsistencies
    const missingInIndex = Array.from(expectedQuizIds).filter(
      (id) => !indexedQuizIds.has(id)
    );
    const extraInIndex = Array.from(indexedQuizIds).filter(
      (id) => !expectedQuizIds.has(id)
    );

    // Report findings
    console.log('═'.repeat(60));
    console.log('CONSISTENCY CHECK RESULTS');
    console.log('═'.repeat(60));
    console.log(`✅ Quizzes in both:        ${expectedQuizIds.size - missingInIndex.length}`);
    console.log(`⚠️  Missing from index:     ${missingInIndex.length}`);
    console.log(`⚠️  Extra in index:         ${extraInIndex.length}`);
    console.log('═'.repeat(60));
    console.log();

    if (missingInIndex.length > 0) {
      console.log('❌ Quizzes missing from index:');
      for (const quizId of missingInIndex.slice(0, 10)) {
        const quiz = quizzesSnapshot.docs.find((d) => d.id === quizId);
        console.log(`   - ${quizId}: ${quiz?.data().title}`);
      }
      if (missingInIndex.length > 10) {
        console.log(`   ... and ${missingInIndex.length - 10} more`);
      }
      console.log();
    }

    if (extraInIndex.length > 0) {
      console.log('⚠️ Quizzes in index but not approved:');
      for (const quizId of extraInIndex.slice(0, 10)) {
        console.log(`   - ${quizId}`);
      }
      if (extraInIndex.length > 10) {
        console.log(`   ... and ${extraInIndex.length - 10} more`);
      }
      console.log();
    }

    // Decide if rebuild is needed
    const needsRebuild = missingInIndex.length > 0 || extraInIndex.length > 0;

    if (!needsRebuild && !FORCE_FLAG) {
      console.log('✅ Index is consistent! No rebuild needed.\n');
      process.exit(0);
    }

    if (FORCE_FLAG) {
      console.log('🔨 Force flag detected. Rebuilding index...\n');
    } else {
      console.log('⚠️ Inconsistency detected! Rebuilding index...\n');
    }

    // Rebuild index
    console.log('🏗️ Building fresh index from Firestore...');
    const newIndex = await buildIndex();

    console.log('\n💾 Uploading to Cloud Storage...');
    await saveIndexToStorage(newIndex);

    console.log('\n✅ Index successfully rebuilt and uploaded!');
    console.log(`   Total chunks: ${newIndex.totalChunks}`);
    console.log(`   Unique quizzes: ${expectedQuizIds.size}`);
    console.log();

    console.log('🎉 Re-sync complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Re-sync failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
