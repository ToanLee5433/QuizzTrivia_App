/**
 * 📤 Upload Vector Index to Cloud Storage
 * 
 * This script uploads a locally built vector index to Cloud Storage
 * Should be run after buildVectorIndex.ts completes
 * 
 * Usage:
 *   npx tsx scripts/uploadIndexToStorage.ts
 */

import { initializeApp, getApps } from 'firebase/app';
import * as admin from 'firebase-admin';
import * as fs from 'fs/promises';
import * as path from 'path';

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

const STORAGE_BUCKET = 'datn-quizapp.appspot.com';
const INDEX_PATH = 'rag/indices/vector-index.json';
const LOCAL_INDEX_PATH = path.join(process.cwd(), 'data', 'vector-index.json');

async function main() {
  console.log('📤 Uploading vector index to Cloud Storage...\n');

  try {
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      // For local development, use service account
      // For production, this will use default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: STORAGE_BUCKET,
      });
    }

    // Check if local index exists
    console.log(`📂 Checking local index: ${LOCAL_INDEX_PATH}`);
    
    try {
      await fs.access(LOCAL_INDEX_PATH);
    } catch (error) {
      console.error('❌ Local index file not found!');
      console.log('\n💡 Please run the build script first:');
      console.log('   npm run build:index');
      process.exit(1);
    }

    // Read local index
    console.log('📖 Reading local index file...');
    const indexContent = await fs.readFile(LOCAL_INDEX_PATH, 'utf-8');
    const index = JSON.parse(indexContent);

    // Validate index
    if (!index.chunks || !Array.isArray(index.chunks)) {
      throw new Error('Invalid index format: missing chunks array');
    }

    const sizeMB = (indexContent.length / 1024 / 1024).toFixed(2);
    console.log(`✅ Loaded index: ${index.totalChunks} chunks, ${sizeMB} MB\n`);

    // Create backup if index already exists
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    const indexFile = bucket.file(INDEX_PATH);
    const [exists] = await indexFile.exists();

    if (exists) {
      console.log('🔄 Creating backup of existing index...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupPath = `rag/backups/${timestamp}_index.json`;
      const backupFile = bucket.file(backupPath);
      
      await indexFile.copy(backupFile);
      console.log(`✅ Backup created: ${backupPath}\n`);
    }

    // Upload to Storage
    console.log(`☁️  Uploading to: gs://${STORAGE_BUCKET}/${INDEX_PATH}`);
    
    await indexFile.save(indexContent, {
      contentType: 'application/json',
      metadata: {
        metadata: {
          version: index.version,
          totalChunks: index.totalChunks.toString(),
          createdAt: new Date(index.createdAt).toISOString(),
          uploadedAt: new Date().toISOString(),
          sizeMB,
        },
      },
    });

    console.log('✅ Upload complete!\n');

    // Get file metadata
    const [metadata] = await indexFile.getMetadata();
    console.log('📊 Upload Summary:');
    console.log(`   Total chunks: ${index.totalChunks}`);
    console.log(`   File size: ${sizeMB} MB`);
    console.log(`   Storage path: ${INDEX_PATH}`);
    console.log(`   Public URL: ${metadata.mediaLink}`);
    console.log(`   Created: ${new Date(index.createdAt).toLocaleString()}`);
    console.log(`   Uploaded: ${new Date().toLocaleString()}\n`);

    console.log('🎉 Index successfully uploaded to Cloud Storage!');
    console.log('\n📝 Next steps:');
    console.log('1. Deploy Cloud Functions that use Storage');
    console.log('2. Test chatbot to ensure it loads from Storage');
    console.log('3. (Optional) Delete Firestore document if migration is complete\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
