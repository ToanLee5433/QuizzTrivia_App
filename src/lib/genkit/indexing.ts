/**
 * 📚 Data Indexing Service
 * 
 * Extracts text from various sources and creates embeddings
 */

import { collection, getDocs } from 'firebase/firestore';
import { ref as storageRef, listAll } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import type { ChunkMetadata, IndexedChunk, VectorIndex } from './types';
import { generateEmbedding } from './embeddings';
import CryptoJS from 'crypto-js';

/**
 * Extract text from Firestore quizzes
 */
export async function extractQuizData(): Promise<ChunkMetadata[]> {
  console.log('📖 Extracting quiz data from Firestore...');
  
  const chunks: ChunkMetadata[] = [];
  const quizzesSnap = await getDocs(collection(db, 'quizzes'));
  
  for (const quizDoc of quizzesSnap.docs) {
    const quiz = quizDoc.data();
    
    // Skip non-approved quizzes
    if (quiz.status !== 'approved') continue;
    
    const quizId = quizDoc.id;
    const visibility = quiz.visibility || 'public';
    
    // Extract quiz metadata as chunk
    const quizText = `
Tiêu đề: ${quiz.title}
Mô tả: ${quiz.description || 'Không có mô tả'}
Danh mục: ${quiz.category || 'Chưa phân loại'}
Độ khó: ${quiz.difficulty || 'Chưa xác định'}
    `.trim();
    
    chunks.push({
      chunkId: `quiz_${quizId}_meta`,
      text: quizText,
      title: quiz.title,
      sourceType: 'quiz',
      visibility,
      quizId: visibility === 'password' ? quizId : undefined,
      createdAt: quiz.createdAt?.toMillis?.() || Date.now(),
      contentHash: CryptoJS.SHA256(quizText).toString(),
    });
    
    // Extract questions (if public OR if we're doing full indexing)
    if (visibility === 'public') {
      const questionsSnap = await getDocs(
        collection(db, 'quizzes', quizId, 'questions')
      );
      
      for (const qDoc of questionsSnap.docs) {
        const question = qDoc.data();
        
        const questionText = `
Câu hỏi: ${question.question}
Các đáp án:
${question.options.map((opt: string, i: number) => `  ${i + 1}. ${opt}`).join('\n')}
Đáp án đúng: ${question.options[question.correctAnswer]}
${question.explanation ? `Giải thích: ${question.explanation}` : ''}
        `.trim();
        
        chunks.push({
          chunkId: `quiz_${quizId}_q_${qDoc.id}`,
          text: questionText,
          title: `${quiz.title} - Câu ${qDoc.id}`,
          sourceType: 'quiz',
          visibility: 'public',
          createdAt: Date.now(),
          contentHash: CryptoJS.SHA256(questionText).toString(),
        });
      }
    }
  }
  
  console.log(`✅ Extracted ${chunks.length} chunks from quizzes`);
  return chunks;
}

/**
 * Extract text from PDF files in Storage
 * (Requires PDF.js or similar library - placeholder for now)
 */
export async function extractPDFData(): Promise<ChunkMetadata[]> {
  console.log('📄 Extracting PDF data from Storage...');
  
  const chunks: ChunkMetadata[] = [];
  
  try {
    // List all PDFs in learning-resources folder
    const pdfFolder = storageRef(storage, 'learning-resources/pdfs');
    const pdfList = await listAll(pdfFolder);
    
    console.log(`Found ${pdfList.items.length} PDF files`);
    
    // TODO: Implement PDF text extraction
    // For now, we'll just log the file names
    for (const item of pdfList.items) {
      console.log(`  - ${item.name}`);
    }
    
    // Placeholder: In production, use pdf-parse or Cloud Function
    // to extract text from each PDF
    
  } catch (error) {
    console.warn('⚠️ PDF extraction not yet implemented:', error);
  }
  
  return chunks;
}

/**
 * Chunk text into smaller pieces (300-800 tokens)
 */
export function chunkText(
  text: string,
  maxTokens: number = 500,
  overlap: number = 50
): string[] {
  // Simple chunking by characters (approximation: 1 token ≈ 4 chars)
  const maxChars = maxTokens * 4;
  const overlapChars = overlap * 4;
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const chunk = text.slice(start, end);
    
    // Only add non-empty chunks
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    
    // Move to next chunk with overlap
    start = end - overlapChars;
    
    // Avoid infinite loop
    if (start <= 0 || end >= text.length) break;
  }
  
  return chunks;
}

/**
 * Build complete vector index
 */
export async function buildIndex(): Promise<VectorIndex> {
  console.log('\n🏗️ Building vector index...\n');
  
  const startTime = Date.now();
  
  // 1. Extract data from sources
  const quizChunks = await extractQuizData();
  const pdfChunks = await extractPDFData();
  
  const allChunks = [...quizChunks, ...pdfChunks];
  
  console.log(`\n📊 Total chunks: ${allChunks.length}`);
  
  // 2. Generate embeddings for each chunk
  console.log('\n🧠 Generating embeddings...');
  const indexedChunks: IndexedChunk[] = [];
  
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    
    try {
      const embedding = await generateEmbedding(chunk.text);
      
      indexedChunks.push({
        ...chunk,
        embedding,
      });
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ ${i + 1}/${allChunks.length} chunks embedded`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to embed chunk ${chunk.chunkId}:`, error);
    }
  }
  
  console.log(`✅ Embedded ${indexedChunks.length} chunks`);
  
  // 3. Count sources
  const sources: { [key: string]: number } = {};
  indexedChunks.forEach(chunk => {
    sources[chunk.sourceType] = (sources[chunk.sourceType] || 0) + 1;
  });
  
  // 4. Build index object
  const index: VectorIndex = {
    version: '1.0.0',
    createdAt: Date.now(),
    totalChunks: indexedChunks.length,
    chunks: indexedChunks,
    sources,
  };
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Index built successfully in ${duration}s`);
  console.log('📊 Sources:', sources);
  
  return index;
}

/**
 * Save index to JSON file (for development)
 * In production, upload to Storage or use pgvector
 */
export async function saveIndexToFile(index: VectorIndex, filename: string = 'vector-index.json') {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const indexPath = path.join(process.cwd(), 'data', filename);
  
  // Create data directory if not exists
  try {
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
  } catch (e) {
    // Directory already exists
  }
  
  await fs.writeFile(
    indexPath,
    JSON.stringify(index, null, 2),
    'utf-8'
  );
  
  const sizeMB = (JSON.stringify(index).length / 1024 / 1024).toFixed(2);
  console.log(`\n💾 Index saved to: ${indexPath}`);
  console.log(`📦 Size: ${sizeMB} MB`);
}

/**
 * Load index from file
 */
export async function loadIndexFromFile(filename: string = 'vector-index.json'): Promise<VectorIndex> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const indexPath = path.join(process.cwd(), 'data', filename);
  const content = await fs.readFile(indexPath, 'utf-8');
  
  return JSON.parse(content);
}
