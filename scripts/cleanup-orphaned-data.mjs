/**
 * Cleanup Orphaned Data Script
 * 
 * This script cleans up orphaned data in Firestore:
 * - quizResults with non-existent quizId
 * - userQuizActivities with non-existent quizId  
 * - user_favorites containing non-existent quizIds
 * 
 * Run with: node scripts/cleanup-orphaned-data.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load service account
let serviceAccount;
const possiblePaths = [
  join(__dirname, '../serviceAccountKey.json'),
  join(__dirname, '../firebase-admin-key.json'),
  join(__dirname, '../datn-quizapp-firebase-adminsdk.json'),
];

for (const path of possiblePaths) {
  if (existsSync(path)) {
    serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
    console.log(`✅ Found service account at: ${path}`);
    break;
  }
}

if (!serviceAccount) {
  console.error('❌ No service account key found!');
  console.log('Please place one of these files in the project root:');
  console.log('  - serviceAccountKey.json');
  console.log('  - firebase-admin-key.json');
  console.log('  - datn-quizapp-firebase-adminsdk.json');
  console.log('\nDownload from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function main() {
  console.log('\n🧹 Starting Firestore Cleanup...\n');
  
  // Step 1: Get all existing quiz IDs
  console.log('📚 Fetching all quiz IDs...');
  const quizzesSnap = await db.collection('quizzes').get();
  const existingQuizIds = new Set(quizzesSnap.docs.map(doc => doc.id));
  console.log(`   Found ${existingQuizIds.size} quizzes in database\n`);
  
  // Step 2: Check quizResults for orphaned data
  console.log('🔍 Checking quizResults...');
  const resultsSnap = await db.collection('quizResults').get();
  const orphanedResults = [];
  
  resultsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.quizId && !existingQuizIds.has(data.quizId)) {
      orphanedResults.push({
        id: doc.id,
        quizId: data.quizId,
        userId: data.userId
      });
    }
  });
  
  console.log(`   Total results: ${resultsSnap.size}`);
  console.log(`   Orphaned results: ${orphanedResults.length}`);
  
  if (orphanedResults.length > 0) {
    console.log('\n   Orphaned quizResults:');
    orphanedResults.forEach(r => {
      console.log(`     - ${r.id} (quizId: ${r.quizId})`);
    });
  }
  
  // Step 3: Check userQuizActivities for orphaned data
  console.log('\n🔍 Checking userQuizActivities...');
  const activitiesSnap = await db.collection('userQuizActivities').get();
  const orphanedActivities = [];
  
  activitiesSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.quizId && !existingQuizIds.has(data.quizId)) {
      orphanedActivities.push({
        id: doc.id,
        quizId: data.quizId,
        userId: data.userId
      });
    }
  });
  
  console.log(`   Total activities: ${activitiesSnap.size}`);
  console.log(`   Orphaned activities: ${orphanedActivities.length}`);
  
  if (orphanedActivities.length > 0) {
    console.log('\n   Orphaned userQuizActivities:');
    orphanedActivities.forEach(a => {
      console.log(`     - ${a.id} (quizId: ${a.quizId})`);
    });
  }
  
  // Step 4: Check user_favorites for orphaned quizIds
  console.log('\n🔍 Checking user_favorites...');
  const favoritesSnap = await db.collection('user_favorites').get();
  const favoritesWithOrphanedQuizzes = [];
  
  favoritesSnap.docs.forEach(doc => {
    const data = doc.data();
    if (Array.isArray(data.quizIds)) {
      const orphanedQuizIds = data.quizIds.filter(id => !existingQuizIds.has(id));
      if (orphanedQuizIds.length > 0) {
        favoritesWithOrphanedQuizzes.push({
          userId: doc.id,
          orphanedQuizIds,
          totalQuizIds: data.quizIds.length
        });
      }
    }
  });
  
  console.log(`   Total favorites docs: ${favoritesSnap.size}`);
  console.log(`   Docs with orphaned quizIds: ${favoritesWithOrphanedQuizzes.length}`);
  
  if (favoritesWithOrphanedQuizzes.length > 0) {
    console.log('\n   user_favorites with orphaned quizIds:');
    favoritesWithOrphanedQuizzes.forEach(f => {
      console.log(`     - User ${f.userId}: ${f.orphanedQuizIds.length} orphaned out of ${f.totalQuizIds}`);
      console.log(`       Orphaned IDs: ${f.orphanedQuizIds.join(', ')}`);
    });
  }
  
  // Step 5: Check quizReviews for orphaned data
  console.log('\n🔍 Checking quizReviews...');
  const reviewsSnap = await db.collection('quizReviews').get();
  const orphanedReviews = [];
  
  reviewsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.quizId && !existingQuizIds.has(data.quizId)) {
      orphanedReviews.push({
        id: doc.id,
        quizId: data.quizId,
        userId: data.userId
      });
    }
  });
  
  console.log(`   Total reviews: ${reviewsSnap.size}`);
  console.log(`   Orphaned reviews: ${orphanedReviews.length}`);
  
  if (orphanedReviews.length > 0) {
    console.log('\n   Orphaned quizReviews:');
    orphanedReviews.forEach(r => {
      console.log(`     - ${r.id} (quizId: ${r.quizId})`);
    });
  }
  
  // Summary
  const totalOrphaned = orphanedResults.length + orphanedActivities.length + 
    favoritesWithOrphanedQuizzes.reduce((sum, f) => sum + f.orphanedQuizIds.length, 0) +
    orphanedReviews.length;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Orphaned quizResults: ${orphanedResults.length}`);
  console.log(`   Orphaned userQuizActivities: ${orphanedActivities.length}`);
  console.log(`   Orphaned entries in user_favorites: ${favoritesWithOrphanedQuizzes.reduce((sum, f) => sum + f.orphanedQuizIds.length, 0)}`);
  console.log(`   Orphaned quizReviews: ${orphanedReviews.length}`);
  console.log(`   TOTAL ORPHANED: ${totalOrphaned}`);
  console.log('='.repeat(50));
  
  if (totalOrphaned === 0) {
    console.log('\n✅ No orphaned data found! Database is clean.\n');
    return;
  }
  
  // Ask for confirmation to delete
  console.log('\n⚠️  Do you want to DELETE all orphaned data? (y/n)');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('> ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n🗑️  Deleting orphaned data...\n');
      
      // Delete orphaned quizResults
      if (orphanedResults.length > 0) {
        console.log('   Deleting orphaned quizResults...');
        const batch1 = db.batch();
        orphanedResults.forEach(r => {
          batch1.delete(db.collection('quizResults').doc(r.id));
        });
        await batch1.commit();
        console.log(`   ✅ Deleted ${orphanedResults.length} quizResults`);
      }
      
      // Delete orphaned userQuizActivities
      if (orphanedActivities.length > 0) {
        console.log('   Deleting orphaned userQuizActivities...');
        const batch2 = db.batch();
        orphanedActivities.forEach(a => {
          batch2.delete(db.collection('userQuizActivities').doc(a.id));
        });
        await batch2.commit();
        console.log(`   ✅ Deleted ${orphanedActivities.length} userQuizActivities`);
      }
      
      // Clean user_favorites
      if (favoritesWithOrphanedQuizzes.length > 0) {
        console.log('   Cleaning user_favorites...');
        const batch3 = db.batch();
        for (const f of favoritesWithOrphanedQuizzes) {
          const docRef = db.collection('user_favorites').doc(f.userId);
          const docSnap = await docRef.get();
          const currentQuizIds = docSnap.data()?.quizIds || [];
          const cleanedQuizIds = currentQuizIds.filter(id => existingQuizIds.has(id));
          batch3.update(docRef, { quizIds: cleanedQuizIds });
        }
        await batch3.commit();
        console.log(`   ✅ Cleaned ${favoritesWithOrphanedQuizzes.length} user_favorites docs`);
      }
      
      // Delete orphaned quizReviews
      if (orphanedReviews.length > 0) {
        console.log('   Deleting orphaned quizReviews...');
        const batch4 = db.batch();
        orphanedReviews.forEach(r => {
          batch4.delete(db.collection('quizReviews').doc(r.id));
        });
        await batch4.commit();
        console.log(`   ✅ Deleted ${orphanedReviews.length} quizReviews`);
      }
      
      console.log('\n✅ Cleanup complete!\n');
    } else {
      console.log('\n❌ Cleanup cancelled.\n');
    }
    
    rl.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
