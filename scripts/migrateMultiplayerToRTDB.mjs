#!/usr/bin/env node
/**
 * 🔄 Firebase Data Migration Script
 * 
 * Purpose: Migrate multiplayer game state from Firestore to RTDB
 * 
 * What this script does:
 * 1. Analyze current Firestore multiplayer_rooms structure
 * 2. Identify fields that should move to RTDB
 * 3. Create backup before migration
 * 4. Perform migration (dry-run by default)
 * 5. Verify data integrity
 * 
 * Usage:
 *   node scripts/migrateMultiplayerToRTDB.mjs --dry-run    # Preview changes
 *   node scripts/migrateMultiplayerToRTDB.mjs --execute    # Actually migrate
 *   node scripts/migrateMultiplayerToRTDB.mjs --rollback   # Restore from backup
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { getDatabase, ref, set, remove } from 'firebase/database';
import * as fs from 'fs';
import * as path from 'path';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBaT1-_tz1e0PTU03dZDcmFbT_FN-KPSbs",
  authDomain: "datn-quizapp.firebaseapp.com",
  projectId: "datn-quizapp",
  storageBucket: "datn-quizapp.firebasestorage.app",
  messagingSenderId: "346763188086",
  appId: "1:346763188086:web:f10b6f1e68c2ed7ec4efb9",
  databaseURL: "https://datn-quizapp-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Fields to migrate from Firestore to RTDB
const RTDB_FIELDS = [
  'currentQuestionIndex',
  'questionStartAt',
  'gameState',
  'questionDuration',
  'countdown'
];

// Backup directory
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'multiplayer-migration');

/**
 * Create backup of current Firestore data
 */
async function createBackup() {
  console.log('\n📦 Creating backup...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const roomsSnapshot = await getDocs(collection(db, 'multiplayer_rooms'));
  const backup = [];

  for (const roomDoc of roomsSnapshot.docs) {
    const data = roomDoc.data();
    backup.push({
      id: roomDoc.id,
      data: data,
      timestamp: Date.now()
    });
  }

  const backupPath = path.join(BACKUP_DIR, `backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  
  console.log(`✅ Backup created: ${backupPath}`);
  console.log(`   Rooms backed up: ${backup.length}`);
  
  return backupPath;
}

/**
 * Analyze current Firestore structure
 */
async function analyzeData() {
  console.log('\n🔍 Analyzing current data structure...\n');
  
  const roomsSnapshot = await getDocs(collection(db, 'multiplayer_rooms'));
  const stats = {
    totalRooms: 0,
    activeRooms: 0,
    fieldsToMigrate: {},
    estimatedRTDBWrites: 0,
    estimatedFirestoreDeletes: 0
  };

  for (const roomDoc of roomsSnapshot.docs) {
    stats.totalRooms++;
    const data = roomDoc.data();
    
    // Check if room is active
    if (data.status === 'playing' || data.status === 'waiting') {
      stats.activeRooms++;
    }

    // Count fields to migrate
    RTDB_FIELDS.forEach(field => {
      if (data[field] !== undefined) {
        stats.fieldsToMigrate[field] = (stats.fieldsToMigrate[field] || 0) + 1;
        stats.estimatedRTDBWrites++;
      }
    });
  }

  // Calculate estimated costs
  const firestoreDeleteCost = (stats.estimatedFirestoreDeletes * 0.02) / 100000;
  const rtdbWriteCost = 0; // First 1GB free

  console.log('📊 Analysis Results:');
  console.log('─────────────────────────────────────');
  console.log(`Total Rooms:           ${stats.totalRooms}`);
  console.log(`Active Rooms:          ${stats.activeRooms}`);
  console.log(`Rooms to Migrate:      ${stats.totalRooms}`);
  console.log('');
  console.log('Fields to migrate:');
  Object.entries(stats.fieldsToMigrate).forEach(([field, count]) => {
    console.log(`  • ${field}: ${count} instances`);
  });
  console.log('');
  console.log(`Est. RTDB writes:      ${stats.estimatedRTDBWrites}`);
  console.log(`Est. Firestore ops:    ${stats.estimatedFirestoreDeletes}`);
  console.log('');
  console.log('💰 Estimated Cost:');
  console.log(`  Firestore:           $${firestoreDeleteCost.toFixed(4)}`);
  console.log(`  RTDB:                $0.00 (within free tier)`);
  console.log('─────────────────────────────────────\n');

  return stats;
}

/**
 * Migrate single room
 */
async function migrateRoom(roomId, roomData, dryRun = true) {
  const rtdbData = {};
  const firestoreUpdates = {};

  // Extract RTDB fields
  RTDB_FIELDS.forEach(field => {
    if (roomData[field] !== undefined) {
      rtdbData[field] = roomData[field];
      firestoreUpdates[field] = deleteField();
    }
  });

  if (Object.keys(rtdbData).length === 0) {
    return { skipped: true };
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would migrate ${Object.keys(rtdbData).length} fields`);
    console.log(`    RTDB path: /rooms/${roomId}/state`);
    console.log(`    Data:`, rtdbData);
    return { dryRun: true, fields: Object.keys(rtdbData) };
  }

  // Actual migration
  try {
    // 1. Write to RTDB
    const rtdbRef = ref(rtdb, `rooms/${roomId}/state`);
    await set(rtdbRef, {
      ...rtdbData,
      migratedAt: Date.now(),
      migratedFrom: 'firestore'
    });

    // 2. Remove from Firestore
    const firestoreRef = doc(db, 'multiplayer_rooms', roomId);
    await updateDoc(firestoreRef, firestoreUpdates);

    console.log(`  ✅ Migrated room ${roomId}`);
    return { success: true, fields: Object.keys(rtdbData) };
  } catch (error) {
    console.error(`  ❌ Failed to migrate room ${roomId}:`, error.message);
    return { error: error.message };
  }
}

/**
 * Perform migration
 */
async function migrate(dryRun = true) {
  const mode = dryRun ? '[DRY RUN]' : '[EXECUTE]';
  console.log(`\n🚀 Starting migration ${mode}...\n`);

  if (!dryRun) {
    await createBackup();
  }

  const roomsSnapshot = await getDocs(collection(db, 'multiplayer_rooms'));
  const results = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0
  };

  for (const roomDoc of roomsSnapshot.docs) {
    results.total++;
    const roomId = roomDoc.id;
    const roomData = roomDoc.data();

    console.log(`\n📂 Processing room: ${roomId}`);
    console.log(`   Status: ${roomData.status || 'unknown'}`);
    console.log(`   Host: ${roomData.hostName || 'N/A'}`);

    const result = await migrateRoom(roomId, roomData, dryRun);

    if (result.skipped) {
      results.skipped++;
      console.log(`  ⏭️  Skipped (no fields to migrate)`);
    } else if (result.error) {
      results.failed++;
    } else {
      results.migrated++;
    }

    // Rate limiting (avoid overwhelming Firebase)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`\n📈 Migration Summary ${mode}:`);
  console.log('─────────────────────────────────────');
  console.log(`Total Rooms:      ${results.total}`);
  console.log(`Migrated:         ${results.migrated}`);
  console.log(`Skipped:          ${results.skipped}`);
  console.log(`Failed:           ${results.failed}`);
  console.log('─────────────────────────────────────\n');

  if (dryRun) {
    console.log('💡 This was a dry run. No changes were made.');
    console.log('   To execute migration, run: node scripts/migrateMultiplayerToRTDB.mjs --execute\n');
  } else {
    console.log('✅ Migration completed!\n');
  }

  return results;
}

/**
 * Rollback migration from backup
 */
async function rollback(backupPath) {
  console.log(`\n🔄 Rolling back from backup: ${backupPath}\n`);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  console.log(`Found ${backup.length} rooms in backup`);

  let restored = 0;
  let failed = 0;

  for (const room of backup) {
    try {
      // Restore Firestore data
      const firestoreRef = doc(db, 'multiplayer_rooms', room.id);
      await updateDoc(firestoreRef, room.data);

      // Remove RTDB data
      const rtdbRef = ref(rtdb, `rooms/${room.id}/state`);
      await remove(rtdbRef);

      console.log(`✅ Restored room ${room.id}`);
      restored++;
    } catch (error) {
      console.error(`❌ Failed to restore room ${room.id}:`, error.message);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '═'.repeat(50));
  console.log('\n📈 Rollback Summary:');
  console.log('─────────────────────────────────────');
  console.log(`Total:        ${backup.length}`);
  console.log(`Restored:     ${restored}`);
  console.log(`Failed:       ${failed}`);
  console.log('─────────────────────────────────────\n');
}

/**
 * Verify migration integrity
 */
async function verify() {
  console.log('\n🔍 Verifying migration...\n');

  const roomsSnapshot = await getDocs(collection(db, 'multiplayer_rooms'));
  const issues = [];

  for (const roomDoc of roomsSnapshot.docs) {
    const roomId = roomDoc.id;
    const firestoreData = roomDoc.data();

    // Check if RTDB fields still exist in Firestore
    const hasRTDBFields = RTDB_FIELDS.some(field => firestoreData[field] !== undefined);

    if (hasRTDBFields) {
      issues.push({
        roomId,
        issue: 'RTDB fields still in Firestore',
        fields: RTDB_FIELDS.filter(f => firestoreData[f] !== undefined)
      });
    }

    // Check if RTDB data exists
    const rtdbSnapshot = await get(ref(rtdb, `rooms/${roomId}/state`));
    if (!rtdbSnapshot.exists() && firestoreData.status === 'playing') {
      issues.push({
        roomId,
        issue: 'Active room missing RTDB state'
      });
    }
  }

  if (issues.length === 0) {
    console.log('✅ Verification passed! No issues found.\n');
  } else {
    console.log('⚠️  Verification found issues:\n');
    issues.forEach(issue => {
      console.log(`  Room ${issue.roomId}:`);
      console.log(`    Issue: ${issue.issue}`);
      if (issue.fields) {
        console.log(`    Fields: ${issue.fields.join(', ')}`);
      }
    });
    console.log('');
  }

  return issues;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--help';

  console.log('\n' + '═'.repeat(50));
  console.log('  🔄 Firebase Data Migration Tool');
  console.log('  Multiplayer: Firestore → RTDB');
  console.log('═'.repeat(50));

  try {
    switch (command) {
      case '--analyze':
        await analyzeData();
        break;

      case '--dry-run':
        await analyzeData();
        await migrate(true);
        break;

      case '--execute':
        console.log('\n⚠️  WARNING: This will modify your production database!');
        console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await analyzeData();
        await migrate(false);
        await verify();
        break;

      case '--rollback':
        const backupPath = args[1];
        if (!backupPath) {
          console.error('\n❌ Error: Please specify backup file path');
          console.log('   Usage: node scripts/migrateMultiplayerToRTDB.mjs --rollback <backup-path>\n');
          process.exit(1);
        }
        await rollback(backupPath);
        break;

      case '--verify':
        await verify();
        break;

      case '--help':
      default:
        console.log('\n📖 Usage:');
        console.log('  node scripts/migrateMultiplayerToRTDB.mjs [command]\n');
        console.log('Commands:');
        console.log('  --analyze   Show current data structure and migration plan');
        console.log('  --dry-run   Preview migration without making changes (default)');
        console.log('  --execute   Perform actual migration');
        console.log('  --rollback <backup-path>  Restore from backup');
        console.log('  --verify    Check migration integrity');
        console.log('  --help      Show this help message\n');
        console.log('Examples:');
        console.log('  node scripts/migrateMultiplayerToRTDB.mjs --analyze');
        console.log('  node scripts/migrateMultiplayerToRTDB.mjs --dry-run');
        console.log('  node scripts/migrateMultiplayerToRTDB.mjs --execute');
        console.log('  node scripts/migrateMultiplayerToRTDB.mjs --rollback backups/multiplayer-migration/backup_1699000000.json\n');
        break;
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
