/**
 * Script to build the vector index for RAG chatbot
 * This will:
 * 1. Extract data from Firestore (quizzes)
 * 2. Generate embeddings for each chunk
 * 3. Save the index to data/vector-index.json
 * 
 * Usage: node --loader tsx scripts/buildVectorIndex.mjs
 * Or compile TypeScript first: tsc && node scripts/buildVectorIndex.mjs
 */

// NOTE: This file needs to be run with tsx or after TypeScript compilation
// For now, we'll create a simpler approach using dynamic imports

import { initializeApp } from 'firebase/app';

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
  console.log('⚠️  Note: This script requires the TypeScript files to be compiled first.');
  console.log('📝 Please run: npm run build:index or tsc first\n');

  try {
    // Initialize Firebase
    console.log('📱 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized\n');

    // Try to import the compiled indexing module
    let indexingModule;
    try {
      // This will work after TypeScript compilation
      indexingModule = await import('../dist/lib/genkit/indexing.js');
    } catch (e) {
      console.error('❌ Could not import indexing module.');
      console.error('Please compile TypeScript first: npm run build or tsc');
      console.error('Or use tsx: npx tsx scripts/buildVectorIndex.mjs');
      process.exit(1);
    }

    const { buildIndex, saveIndexToFile } = indexingModule;

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
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Index saved! File size: ${fileSizeMB} MB\n`);

    console.log('🎉 Build complete! The chatbot is ready to use the index.');
    console.log(`📂 Index file: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error building index:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
