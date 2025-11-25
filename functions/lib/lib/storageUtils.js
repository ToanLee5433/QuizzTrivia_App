"use strict";
/**
 * 🗄️ Cloud Storage Utilities
 *
 * Manages vector index storage in Firebase Cloud Storage
 * Replaces Firestore document storage to overcome 1MB limit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateFromFirestore = exports.indexExists = exports.getIndexMetadata = exports.restoreFromBackup = exports.listBackups = exports.cleanOldBackups = exports.createDailyBackup = exports.createBackupVersion = exports.saveIndexToStorage = exports.loadIndexFromStorage = void 0;
const admin = require("firebase-admin");
const STORAGE_BUCKET = 'datn-quizapp.appspot.com'; // Your Firebase Storage bucket
const INDEX_PATH = 'rag/indices/vector-index.json';
const BACKUP_PATH = 'rag/backups';
/**
 * Load vector index from Cloud Storage
 */
async function loadIndexFromStorage(path = INDEX_PATH) {
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
        const index = JSON.parse(content.toString('utf-8'));
        console.log(`✅ Loaded index from Storage: ${index.totalChunks} chunks`);
        return index;
    }
    catch (error) {
        console.error('❌ Error loading index from Storage:', error);
        throw error;
    }
}
exports.loadIndexFromStorage = loadIndexFromStorage;
/**
 * Save vector index to Cloud Storage
 *
 * @param index - Vector index to save
 * @param path - Storage path (default: vector-index.json)
 * @param createBackup - Whether to create backup before overwriting
 */
async function saveIndexToStorage(index, path = INDEX_PATH, createBackup = true) {
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
    }
    catch (error) {
        console.error('❌ Error saving index to Storage:', error);
        throw error;
    }
}
exports.saveIndexToStorage = saveIndexToStorage;
/**
 * Create a versioned backup of current index
 */
async function createBackupVersion(sourcePath = INDEX_PATH) {
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
    }
    catch (error) {
        console.error('❌ Error creating backup:', error);
        throw error;
    }
}
exports.createBackupVersion = createBackupVersion;
/**
 * Create a daily backup
 */
async function createDailyBackup() {
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
exports.createDailyBackup = createDailyBackup;
/**
 * Clean up old backups (keep last N days)
 */
async function cleanOldBackups(keepDays = 30) {
    try {
        const bucket = admin.storage().bucket(STORAGE_BUCKET);
        const [files] = await bucket.getFiles({ prefix: BACKUP_PATH });
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - keepDays);
        let deletedCount = 0;
        for (const file of files) {
            const [metadata] = await file.getMetadata();
            const fileDate = new Date(metadata.timeCreated);
            if (fileDate < cutoffDate) {
                await file.delete();
                console.log(`🗑️ Deleted old backup: ${file.name}`);
                deletedCount++;
            }
        }
        console.log(`✅ Cleaned ${deletedCount} old backups`);
        return deletedCount;
    }
    catch (error) {
        console.error('❌ Error cleaning old backups:', error);
        throw error;
    }
}
exports.cleanOldBackups = cleanOldBackups;
/**
 * List all available backups
 */
async function listBackups() {
    try {
        const bucket = admin.storage().bucket(STORAGE_BUCKET);
        const [files] = await bucket.getFiles({ prefix: BACKUP_PATH });
        const backups = await Promise.all(files.map(async (file) => {
            const [metadata] = await file.getMetadata();
            return {
                name: file.name,
                date: new Date(metadata.timeCreated),
                size: parseInt(String(metadata.size || '0')),
            };
        }));
        // Sort by date (newest first)
        backups.sort((a, b) => b.date.getTime() - a.date.getTime());
        return backups;
    }
    catch (error) {
        console.error('❌ Error listing backups:', error);
        throw error;
    }
}
exports.listBackups = listBackups;
/**
 * Restore index from a backup
 */
async function restoreFromBackup(backupPath) {
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
    }
    catch (error) {
        console.error('❌ Error restoring from backup:', error);
        throw error;
    }
}
exports.restoreFromBackup = restoreFromBackup;
/**
 * Get index metadata without downloading full file
 */
async function getIndexMetadata(path = INDEX_PATH) {
    var _a, _b;
    try {
        const bucket = admin.storage().bucket(STORAGE_BUCKET);
        const file = bucket.file(path);
        const [metadata] = await file.getMetadata();
        return {
            exists: true,
            size: parseInt(String(metadata.size || '0')),
            sizeKB: (parseInt(String(metadata.size || '0')) / 1024).toFixed(2),
            sizeMB: (parseInt(String(metadata.size || '0')) / 1024 / 1024).toFixed(2),
            created: new Date(metadata.timeCreated),
            updated: new Date(metadata.updated),
            version: (_a = metadata.metadata) === null || _a === void 0 ? void 0 : _a.version,
            totalChunks: (_b = metadata.metadata) === null || _b === void 0 ? void 0 : _b.totalChunks,
        };
    }
    catch (error) {
        if (error.code === 404) {
            return { exists: false };
        }
        throw error;
    }
}
exports.getIndexMetadata = getIndexMetadata;
/**
 * Check if index exists in Storage
 */
async function indexExists(path = INDEX_PATH) {
    try {
        const bucket = admin.storage().bucket(STORAGE_BUCKET);
        const file = bucket.file(path);
        const [exists] = await file.exists();
        return exists;
    }
    catch (error) {
        console.error('❌ Error checking index existence:', error);
        return false;
    }
}
exports.indexExists = indexExists;
/**
 * Migrate index from Firestore to Storage (one-time migration)
 */
async function migrateFromFirestore() {
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
        const index = firestoreDoc.data();
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
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
exports.migrateFromFirestore = migrateFromFirestore;
//# sourceMappingURL=storageUtils.js.map