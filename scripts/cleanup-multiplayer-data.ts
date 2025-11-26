/**
 * Script để dọn dẹp dữ liệu multiplayer thừa trên Firebase
 * 
 * Chạy script này từ Firebase Functions hoặc local với service account:
 * 
 * 1. Local với service account:
 *    npx ts-node scripts/cleanup-multiplayer-data.ts
 * 
 * 2. Hoặc gọi Cloud Function manualCleanupRooms từ admin panel
 * 
 * Dữ liệu sẽ bị xóa:
 * - RTDB: /rooms/*
 * - Firestore: /multiplayer_rooms/*
 * - Firestore: /archivedRooms/* (nếu có)
 */

import * as admin from 'firebase-admin';

// Initialize with service account for local execution
// const serviceAccount = require('../serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://your-project.firebaseio.com'
// });

// For use within Cloud Functions, just initialize normally
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const rtdb = admin.database();

interface CleanupStats {
  rtdbRooms: number;
  firestoreRooms: number;
  firestorePlayers: number;
  firestoreMessages: number;
  firestoreSubmissions: number;
  archivedRooms: number;
  errors: string[];
}

async function cleanupMultiplayerData(dryRun: boolean = true): Promise<CleanupStats> {
  const stats: CleanupStats = {
    rtdbRooms: 0,
    firestoreRooms: 0,
    firestorePlayers: 0,
    firestoreMessages: 0,
    firestoreSubmissions: 0,
    archivedRooms: 0,
    errors: []
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  MULTIPLAYER DATA CLEANUP ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 1. Cleanup RTDB rooms
    console.log('📦 Checking RTDB rooms...');
    const rtdbRoomsSnap = await rtdb.ref('rooms').once('value');
    const rtdbRooms = rtdbRoomsSnap.val() || {};
    const rtdbRoomIds = Object.keys(rtdbRooms);
    
    console.log(`   Found ${rtdbRoomIds.length} rooms in RTDB`);
    
    for (const roomId of rtdbRoomIds) {
      const room = rtdbRooms[roomId];
      const players = room.players || {};
      const onlineCount = Object.values(players).filter((p: any) => p?.isOnline).length;
      const totalPlayers = Object.keys(players).length;
      
      console.log(`   - Room ${roomId}: ${totalPlayers} players (${onlineCount} online)`);
      
      if (onlineCount === 0) {
        stats.rtdbRooms++;
        if (!dryRun) {
          await rtdb.ref(`rooms/${roomId}`).remove();
          console.log(`     ✅ Deleted from RTDB`);
        } else {
          console.log(`     🔍 Would delete from RTDB`);
        }
      }
    }

    // 2. Cleanup Firestore multiplayer_rooms
    console.log('\n📦 Checking Firestore multiplayer_rooms...');
    const firestoreRoomsSnap = await db.collection('multiplayer_rooms').get();
    
    console.log(`   Found ${firestoreRoomsSnap.size} rooms in Firestore`);
    
    for (const roomDoc of firestoreRoomsSnap.docs) {
      const roomId = roomDoc.id;
      const roomData = roomDoc.data();
      
      // Check if this room still exists in RTDB
      const rtdbRoom = rtdbRooms[roomId];
      const isOrphan = !rtdbRoom;
      
      console.log(`   - Room ${roomId}: ${isOrphan ? '⚠️ ORPHAN (no RTDB)' : 'Has RTDB data'}`);
      
      // Count subcollections
      const playersSnap = await roomDoc.ref.collection('players').get();
      const messagesSnap = await roomDoc.ref.collection('messages').get();
      const submissionsSnap = await roomDoc.ref.collection('submissions').get();
      
      console.log(`     Players: ${playersSnap.size}, Messages: ${messagesSnap.size}, Submissions: ${submissionsSnap.size}`);
      
      if (isOrphan || !rtdbRoom || Object.keys(rtdbRoom.players || {}).length === 0) {
        stats.firestoreRooms++;
        stats.firestorePlayers += playersSnap.size;
        stats.firestoreMessages += messagesSnap.size;
        stats.firestoreSubmissions += submissionsSnap.size;
        
        if (!dryRun) {
          // Delete subcollections first
          for (const playerDoc of playersSnap.docs) {
            await playerDoc.ref.delete();
          }
          for (const msgDoc of messagesSnap.docs) {
            await msgDoc.ref.delete();
          }
          for (const subDoc of submissionsSnap.docs) {
            await subDoc.ref.delete();
          }
          // Then delete room
          await roomDoc.ref.delete();
          console.log(`     ✅ Deleted room and subcollections`);
        } else {
          console.log(`     🔍 Would delete room and ${playersSnap.size + messagesSnap.size + submissionsSnap.size} subcollection docs`);
        }
      }
    }

    // 3. Cleanup archivedRooms (old archive from previous cleanup logic)
    console.log('\n📦 Checking Firestore archivedRooms...');
    const archivedRoomsSnap = await db.collection('archivedRooms').get();
    
    console.log(`   Found ${archivedRoomsSnap.size} archived rooms`);
    
    for (const archivedDoc of archivedRoomsSnap.docs) {
      stats.archivedRooms++;
      
      if (!dryRun) {
        await archivedDoc.ref.delete();
        console.log(`   ✅ Deleted archived room ${archivedDoc.id}`);
      } else {
        console.log(`   🔍 Would delete archived room ${archivedDoc.id}`);
      }
    }

    // 4. Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  CLEANUP SUMMARY ${dryRun ? '(DRY RUN)' : '(COMPLETED)'}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  RTDB rooms to delete:        ${stats.rtdbRooms}`);
    console.log(`  Firestore rooms to delete:   ${stats.firestoreRooms}`);
    console.log(`  - Players subcollection:     ${stats.firestorePlayers}`);
    console.log(`  - Messages subcollection:    ${stats.firestoreMessages}`);
    console.log(`  - Submissions subcollection: ${stats.firestoreSubmissions}`);
    console.log(`  Archived rooms to delete:    ${stats.archivedRooms}`);
    console.log(`${'='.repeat(60)}\n`);

    if (dryRun) {
      console.log('💡 This was a DRY RUN. No data was actually deleted.');
      console.log('   To actually delete, run with dryRun = false');
    }

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error.message);
    stats.errors.push(error.message);
  }

  return stats;
}

// Export for use in Cloud Functions
export { cleanupMultiplayerData };

// Run directly if executed as script
// Uncomment below to run:
// cleanupMultiplayerData(true).then(() => process.exit(0));
