/**
 * 🗄️ Cloud Storage Utilities
 * 
 * Manages vector index storage in Firebase Cloud Storage
 * Replaces Firestore document storage to overcome 1MB limit
 */

import * as admin from 'firebase-admin';
import { VectorIndex } from '../types/genkit';

const STORAGE_BUCKET = 'datn-quizapp.appspot.com'; // Your Firebase Storage bucket
const INDEX_PATH = 'rag/indices/vector-index.json';
const BACKUP_PATH = 'rag/backups';

/**
 * Load vector index from Cloud Storage
 */
export async function loadIndexFromStorage(
  path: string = INDEX_PATH
): Promise<VectorIndex | null> {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const file = bucket.file(path);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`⚠️ Index file not found: ${path}`);
      return null;
    }

    // Download file content
    const [content] = await file.download();
    const index = JSON.parse(content.toString('utf-8')) as VectorIndex;

    console.log(`✅ Loaded index from Storage: ${index.totalChunks} chunks`);
    return index;
  } catch (error) {
    console.error('❌ Error loading index from Storage:', error);
    throw error;
  }
}

/**
 * Save vector index to Cloud Storage
 * 
 * @param index - Vector index to save
 * @param path - Storage path (default: vector-index.json)
 * @param createBackup - Whether to create backup before overwriting
 */
export async function saveIndexToStorage(
  index: VectorIndex,
  path: string = INDEX_PATH,
  createBackup: boolean = true
): Promise<void> {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const file = bucket.file(path);

    // Create backup if requested and file exists
    if (createBackup) {
      const [exists] = await file.exists();
      if (exists) {
        await createBackupVersion(path);
      }
    }

    // Convert index to JSON
    const content = JSON.stringify(index, null, 2);
    const sizeKB = (content.length / 1024).toFixed(2);

    // Upload to Storage
    await file.save(content, {
      contentType: 'application/json',
      metadata: {
        metadata: {
          version: index.version,
          totalChunks: index.totalChunks.toString(),
          createdAt: new Date(index.createdAt).toISOString(),
          updatedAt: new Date().toISOString(),
          sizeKB,
        },
      },
    });

    console.log(`✅ Saved index to Storage: ${path} (${sizeKB} KB)`);
  } catch (error) {
    console.error('❌ Error saving index to Storage:', error);
    throw error;
  }
}

/**
 * Create a versioned backup of current index
 */
export async function createBackupVersion(sourcePath: string = INDEX_PATH): Promise<string> {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const sourceFile = bucket.file(sourcePath);

    // Check if source exists
    const [exists] = await sourceFile.exists();
    if (!exists) {
      console.warn('⚠️ Source file does not exist, skipping backup');
      return '';
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = `${BACKUP_PATH}/${timestamp}_index.json`;
    const destFile = bucket.file(backupPath);

    // Copy file
    await sourceFile.copy(destFile);

    console.log(`✅ Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  }
}

/**
 * Create a daily backup
 */
export async function createDailyBackup(): Promise<string> {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyBackupPath = `${BACKUP_PATH}/${date}_index.json`;

  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const destFile = bucket.file(dailyBackupPath);

  // Check if today's backup already exists
  const [exists] = await destFile.exists();
  if (exists) {
    console.log(`ℹ️ Daily backup already exists: ${dailyBackupPath}`);
    return dailyBackupPath;
  }

  // Create new daily backup
  return await createBackupVersion(INDEX_PATH);
}

/**
 * Clean up old backups (keep last N days)
 */
export async function cleanOldBackups(keepDays: number = 30): Promise<number> {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const [files] = await bucket.getFiles({ prefix: BACKUP_PATH });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    let deletedCount = 0;

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const fileDate = new Date(metadata.timeCreated as string);

      if (fileDate < cutoffDate) {
        await file.delete();
        console.log(`🗑️ Deleted old backup: ${file.name}`);
        deletedCount++;
      }
    }

    console.log(`✅ Cleaned ${deletedCount} old backups`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning old backups:', error);
    throw error;
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<Array<{ name: string; date: Date; size: number }>> {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const [files] = await bucket.getFiles({ prefix: BACKUP_PATH });

    const backups = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          name: file.name,
          date: new Date(metadata.timeCreated as string),
          size: parseInt(String(metadata.size || '0')),
        };
      })
    );

    // Sort by date (newest first)
    backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    return backups;
  } catch (error) {
    console.error('❌ Error listing backups:', error);
    throw error;
  }
}

/**
 * Restore index from a backup
 */
export async function restoreFromBackup(backupPath: string): Promise<VectorIndex> {
  try {
    console.log(`🔄 Restoring index from backup: ${backupPath}`);

    // Load backup
    const backupIndex = await loadIndexFromStorage(backupPath);
    if (!backupIndex) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    // Save as current index (with backup of current)
    await saveIndexToStorage(backupIndex, INDEX_PATH, true);

    console.log(`✅ Index restored from: ${backupPath}`);
    return backupIndex;
  } catch (error) {
    console.error('❌ Error restoring from backup:', error);
    throw error;
  }
}

/**
 * Get index metadata without downloading full file
 */
export async function getIndexMetadata(path: string = INDEX_PATH) {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const file = bucket.file(path);

    const [metadata] = await file.getMetadata();

    return {
      exists: true,
      size: parseInt(String(metadata.size || '0')),
      sizeKB: (parseInt(String(metadata.size || '0')) / 1024).toFixed(2),
      sizeMB: (parseInt(String(metadata.size || '0')) / 1024 / 1024).toFixed(2),
      created: new Date(metadata.timeCreated as string),
      updated: new Date(metadata.updated as string),
      version: metadata.metadata?.version,
      totalChunks: metadata.metadata?.totalChunks,
    };
  } catch (error) {
    if ((error as any).code === 404) {
      return { exists: false };
    }
    throw error;
  }
}

/**
 * Check if index exists in Storage
 */
export async function indexExists(path: string = INDEX_PATH): Promise<boolean> {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const file = bucket.file(path);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('❌ Error checking index existence:', error);
    return false;
  }
}

/**
 * Migrate index from Firestore to Storage (one-time migration)
 */
export async function migrateFromFirestore(): Promise<void> {
  try {
    console.log('🔄 Starting migration from Firestore to Storage...');

    // Load from Firestore
    const firestoreDoc = await admin
      .firestore()
      .collection('system')
      .doc('vector-index')
      .get();

    if (!firestoreDoc.exists) {
      console.log('⚠️ No index found in Firestore');
      return;
    }

    const index = firestoreDoc.data() as VectorIndex;
    console.log(`📊 Found index with ${index.totalChunks} chunks in Firestore`);

    // Check if already exists in Storage
    const storageExists = await indexExists();
    if (storageExists) {
      console.log('⚠️ Index already exists in Storage. Creating backup...');
      await createBackupVersion();
    }

    // Save to Storage
    await saveIndexToStorage(index, INDEX_PATH, false);

    console.log('✅ Migration completed successfully!');
    console.log('ℹ️ You can now safely delete the Firestore document if desired');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
