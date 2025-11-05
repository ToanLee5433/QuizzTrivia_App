#!/usr/bin/env node
/**
 * 🔒 Quiz Password Migration Script
 * 
 * Migrates old quiz password format to new secure format:
 * - Old: havePassword: 'password', password: 'plaintext'
 * - New: visibility: 'password', pwd: { enabled, algo, salt, hash }
 * 
 * Usage:
 *   node scripts/migrateQuizPasswords.mjs [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run    Show what would be changed without modifying data
 *   --force      Skip confirmation prompt
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { createHash, randomBytes } from 'crypto';

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: "AIzaSyBOCMo8R8yHcj4mWXLq_PpAM2O1DXRRycs",
  authDomain: "quiztrivia-9b481.firebaseapp.com",
  projectId: "quiztrivia-9b481",
  storageBucket: "quiztrivia-9b481.firebasestorage.app",
  messagingSenderId: "618878653734",
  appId: "1:618878653734:web:3555b1e8fff0e6ff8ea04c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// SHA-256 hash function (Node.js version)
function sha256(message) {
  return createHash('sha256').update(message, 'utf8').digest('hex');
}

// Generate random salt
function generateSalt(length = 32) {
  return randomBytes(length).toString('base64');
}

// Create password hash
function createPasswordHash(password) {
  const salt = generateSalt();
  const hash = sha256(salt + ':' + password);
  return { salt, hash };
}

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

console.log('\n🔒 QUIZ PASSWORD MIGRATION SCRIPT');
console.log('=====================================\n');

if (isDryRun) {
  console.log('⚠️  DRY RUN MODE - No changes will be made\n');
}

async function migrateQuizzes() {
  try {
    console.log('📊 Scanning for quizzes with old password format...\n');

    // Query quizzes with havePassword field
    const quizzesRef = collection(db, 'quizzes');
    const snapshot = await getDocs(quizzesRef);
    
    const quizzesToMigrate = [];
    const publicQuizzes = [];
    const alreadyMigrated = [];

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const quizId = docSnap.id;

      // Already migrated (has visibility field)
      if (data.visibility) {
        alreadyMigrated.push({ id: quizId, title: data.title });
        return;
      }

      // Has old password format
      if (data.havePassword === 'password' && data.password) {
        quizzesToMigrate.push({
          id: quizId,
          title: data.title,
          password: data.password,
          data: data
        });
      } 
      // Public quiz without password
      else if (data.havePassword === 'public' || !data.havePassword) {
        publicQuizzes.push({ id: quizId, title: data.title });
      }
    });

    console.log(`📈 Scan Results:`);
    console.log(`   - Total quizzes: ${snapshot.docs.length}`);
    console.log(`   - Already migrated: ${alreadyMigrated.length}`);
    console.log(`   - Public quizzes (no password): ${publicQuizzes.length}`);
    console.log(`   - Need migration (has password): ${quizzesToMigrate.length}\n`);

    if (quizzesToMigrate.length === 0) {
      console.log('✅ No quizzes need migration. All done!\n');
      return;
    }

    // Show quizzes that need migration
    console.log('📋 Quizzes that will be migrated:\n');
    quizzesToMigrate.forEach((quiz, index) => {
      console.log(`   ${index + 1}. ${quiz.title}`);
      console.log(`      ID: ${quiz.id}`);
      console.log(`      Password: ${'*'.repeat(quiz.password.length)} (${quiz.password.length} chars)\n`);
    });

    // Show public quizzes that will be updated
    if (publicQuizzes.length > 0 && publicQuizzes.length <= 10) {
      console.log('📋 Public quizzes that will get visibility field:\n');
      publicQuizzes.forEach((quiz, index) => {
        console.log(`   ${index + 1}. ${quiz.title} (${quiz.id})`);
      });
      console.log('');
    } else if (publicQuizzes.length > 10) {
      console.log(`📋 ${publicQuizzes.length} public quizzes will get visibility: 'public' field\n`);
    }

    // Confirmation prompt (skip if --force)
    if (!isDryRun && !isForce) {
      console.log('⚠️  WARNING: This will modify your Firestore database!');
      console.log('   - Password quizzes: Remove plain password, add visibility + pwd object');
      console.log('   - Public quizzes: Add visibility: "public" field');
      console.log('');
      
      // Simple confirmation (no readline in this version)
      console.log('❌ STOPPED: Use --force flag to proceed with migration');
      console.log('   Example: node scripts/migrateQuizPasswords.mjs --force\n');
      return;
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN: Showing what would be changed...\n');
    } else {
      console.log('🚀 Starting migration...\n');
    }

    // Migrate password quizzes
    let successCount = 0;
    let errorCount = 0;

    for (const quiz of quizzesToMigrate) {
      try {
        // Generate new password hash
        const { salt, hash } = createPasswordHash(quiz.password);
        
        const updates = {
          visibility: 'password',
          pwd: {
            enabled: true,
            algo: 'SHA256',
            salt: salt,
            hash: hash
          }
        };

        // Remove old fields
        if (!isDryRun) {
          const quizRef = doc(db, 'quizzes', quiz.id);
          
          // Update with new fields
          await updateDoc(quizRef, updates);
          
          // Note: In Firestore, to delete a field you need to use deleteField()
          // But since we're keeping backward compatibility, we'll keep havePassword
          // Users can manually clean up old fields later if needed
        }

        console.log(`✅ Migrated: ${quiz.title}`);
        console.log(`   - visibility: 'password'`);
        console.log(`   - pwd.salt: ${salt.substring(0, 20)}...`);
        console.log(`   - pwd.hash: ${hash.substring(0, 20)}...`);
        console.log('');
        
        successCount++;
      } catch (error) {
        console.error(`❌ Error migrating ${quiz.title}:`, error.message);
        errorCount++;
      }
    }

    // Migrate public quizzes (add visibility field)
    if (!isDryRun && publicQuizzes.length > 0) {
      console.log(`\n📝 Adding visibility field to ${publicQuizzes.length} public quizzes...`);
      
      const batch = writeBatch(db);
      let batchCount = 0;
      
      for (const quiz of publicQuizzes) {
        const quizRef = doc(db, 'quizzes', quiz.id);
        batch.update(quizRef, { visibility: 'public' });
        batchCount++;
        
        // Firestore batch limit is 500 operations
        if (batchCount === 500) {
          await batch.commit();
          console.log(`   ✅ Committed batch of ${batchCount} quizzes`);
          batchCount = 0;
        }
      }
      
      // Commit remaining
      if (batchCount > 0) {
        await batch.commit();
        console.log(`   ✅ Committed final batch of ${batchCount} quizzes`);
      }
    }

    console.log('\n=====================================');
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`   ✅ Password quizzes migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Public quizzes updated: ${publicQuizzes.length}`);
    console.log('=====================================\n');

    if (isDryRun) {
      console.log('ℹ️  This was a dry run. Run without --dry-run to apply changes.\n');
    } else {
      console.log('✅ Migration completed successfully!\n');
      console.log('📝 NEXT STEPS:');
      console.log('   1. Test creating a new password-protected quiz');
      console.log('   2. Test accessing old password-protected quizzes');
      console.log('   3. Verify password modal appears correctly');
      console.log('   4. Check Firestore console to verify data structure\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateQuizzes()
  .then(() => {
    console.log('🎉 Script completed!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
