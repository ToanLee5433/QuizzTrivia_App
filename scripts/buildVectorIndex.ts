/**
 * Script to build the vector index for RAG chatbot
 * This will:
 * 1. Extract data from Firestore (quizzes)
 * 2. Generate embeddings for each chunk
 * 3. Save the index to data/vector-index.json
 * 
 * Usage: 
 *   npx tsx scripts/buildVectorIndex.ts
 * Or:
 *   npm run build:index (add to package.json scripts)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { buildIndex, saveIndexToFile } from '../src/lib/genkit/indexing';

// Firebase config (same as in your app)
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

async function main() {
  console.log('🚀 Starting vector index build...\n');

  try {
    // Initialize Firebase (avoid duplicate initialization)
    console.log('📱 Initializing Firebase...');
    const app = getApps().length === 0 
      ? initializeApp(firebaseConfig) 
      : getApps()[0];
    const db = getFirestore(app);
    const storage = getStorage(app);
    console.log('✅ Firebase initialized\n');

    // Build the index
    console.log('🔨 Building vector index...');
    console.log('   This may take a few minutes depending on data size...\n');
    
    const startTime = Date.now();
    const index = await buildIndex();
    const endTime = Date.now();
    
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Index built successfully!\n');
    console.log('📊 Index Statistics:');
    console.log(`   Total chunks: ${index.chunks.length}`);
    console.log(`   Quiz chunks: ${index.sources.quiz || 0}`);
    console.log(`   PDF chunks: ${index.sources.pdf || 0}`);
    console.log(`   Web chunks: ${index.sources.web || 0}`);
    console.log(`   Note chunks: ${index.sources.note || 0}`);
    console.log(`   Build time: ${duration}s`);
    console.log(`   Created: ${new Date(index.createdAt).toLocaleString()}\n`);

    // Verify embeddings
    if (index.chunks.length > 0) {
      const firstChunk = index.chunks[0];
      console.log('🔍 Sample chunk:');
      console.log(`   ID: ${firstChunk.chunkId}`);
      console.log(`   Title: ${firstChunk.title}`);
      console.log(`   Source: ${firstChunk.sourceType}`);
      console.log(`   Visibility: ${firstChunk.visibility}`);
      console.log(`   Text preview: ${firstChunk.text.substring(0, 100)}...`);
      console.log(`   Embedding dimensions: ${firstChunk.embedding.length}`);
      console.log(`   Embedding sample: [${firstChunk.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);
    }

    // Save to file
    const outputPath = 'data/vector-index.json';
    console.log(`💾 Saving index to ${outputPath}...`);
    await saveIndexToFile(index, 'vector-index.json');
    
    // Check file size
    const fs = await import('fs');
    const path = await import('path');
    const fullPath = path.join(process.cwd(), 'data', 'vector-index.json');
    const stats = fs.statSync(fullPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Index saved! File size: ${fileSizeMB} MB\n`);

    console.log('🎉 Build complete! The chatbot is ready to use the index.');
    console.log(`📂 Index file: ${fullPath}`);
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error building index:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
