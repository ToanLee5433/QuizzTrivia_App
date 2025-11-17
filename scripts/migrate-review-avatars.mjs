#!/usr/bin/env node

/**
 * Migration Script: Update Reviews with User Avatars
 * 
 * Purpose: Updates existing reviews in Firestore that have null or missing userAvatar
 * by fetching the actual photoURL from the users collection.
 * 
 * Usage: node scripts/migrate-review-avatars.mjs
 * 
 * What it does:
 * 1. Fetches all reviews from 'quizReviews' collection
 * 2. For each review with null/empty userAvatar, fetches user data
 * 3. Updates review with user's photoURL (or empty string if not found)
 * 4. Logs progress and results
 */

import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  await readFile(new URL('../serviceAccountKey.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateReviewAvatars() {
  console.log('🚀 Starting review avatar migration...\n');

  try {
    // Get all reviews
    const reviewsSnapshot = await db.collection('quizReviews').get();
    console.log(`📊 Found ${reviewsSnapshot.size} total reviews\n`);

    let needsUpdate = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    // Process each review
    for (const reviewDoc of reviewsSnapshot.docs) {
      const reviewData = reviewDoc.data();
      const reviewId = reviewDoc.id;
      
      // Check if userAvatar needs update (null or empty string)
      if (reviewData.userAvatar === null || reviewData.userAvatar === undefined || reviewData.userAvatar === '') {
        needsUpdate++;
        
        console.log(`\n🔍 Processing review ${reviewId}:`);
        console.log(`   User: ${reviewData.userName}`);
        console.log(`   UserId: ${reviewData.userId}`);
        console.log(`   Current avatar: ${reviewData.userAvatar}`);

        try {
          // Fetch user data
          const userDoc = await db.collection('users').doc(reviewData.userId).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const photoURL = userData.photoURL || '';
            
            // Update review with photoURL
            await db.collection('quizReviews').doc(reviewId).update({
              userAvatar: photoURL
            });
            
            updated++;
            console.log(`   ✅ Updated with photoURL: ${photoURL || '(empty - no photo)'}`);
          } else {
            // User not found, set empty string
            await db.collection('quizReviews').doc(reviewId).update({
              userAvatar: ''
            });
            
            updated++;
            console.log(`   ⚠️  User not found, set to empty string`);
          }
        } catch (error) {
          failed++;
          console.error(`   ❌ Failed to update: ${error.message}`);
        }
      } else {
        skipped++;
        // Review already has avatar, skip
        if (skipped <= 5) {
          console.log(`✓ Review ${reviewId} already has avatar (${reviewData.userAvatar.substring(0, 50)}...)`);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total reviews:           ${reviewsSnapshot.size}`);
    console.log(`Needed update:           ${needsUpdate}`);
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`❌ Failed:               ${failed}`);
    console.log(`⏭️  Skipped (has avatar): ${skipped}`);
    console.log('='.repeat(60));

    if (updated > 0) {
      console.log('\n✨ Migration completed! All reviews now have proper avatar fields.');
    } else {
      console.log('\n✨ No reviews needed updating. All good!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run migration
migrateReviewAvatars();
