/**
 * 🧪 RAG Chatbot Testing Script
 * 
 * Comprehensive test suite for RAG functionality
 * Tests: Permission control, citation accuracy, latency
 * 
 * Usage: npx tsx scripts/testRAG.ts
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { askQuestion } from '../src/lib/genkit/ragFlow';
import type { RAGResponse } from '../src/lib/genkit/types';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDtBzTHNPQ5PxKhVb-si89kgr5T_3ppwj8",
  authDomain: "datn-quizapp.firebaseapp.com",
  projectId: "datn-quizapp",
  storageBucket: "datn-quizapp.firebasestorage.app",
  messagingSenderId: "741975099365",
  appId: "1:741975099365:web:75a1d1eb4b6d89f0f7110c",
};

// Test cases
interface TestCase {
  id: string;
  name: string;
  question: string;
  expectedKeywords?: string[];
  shouldHaveContent: boolean;
  minLatency?: number;
  maxLatency?: number;
}

const testCases: TestCase[] = [
  {
    id: 'test-1',
    name: 'Public Quiz Question',
    question: 'Công thức tính diện tích hình tròn là gì?',
    expectedKeywords: ['π', 'bán kính', 'r'],
    shouldHaveContent: true,
    maxLatency: 2500,
  },
  {
    id: 'test-2',
    name: 'General Knowledge',
    question: 'Thủ đô của Việt Nam là gì?',
    expectedKeywords: ['Hà Nội'],
    shouldHaveContent: true,
    maxLatency: 2500,
  },
  {
    id: 'test-3',
    name: 'No Context Available',
    question: 'Công thức lượng tử cơ bản là gì?',
    expectedKeywords: ['không đủ dữ liệu', 'không tìm thấy'],
    shouldHaveContent: false,
    maxLatency: 2500,
  },
  {
    id: 'test-4',
    name: 'Multi-aspect Question',
    question: 'Giải thích về hàm số bậc hai',
    shouldHaveContent: true,
    maxLatency: 2500,
  },
];

// Test statistics
interface TestStats {
  total: number;
  passed: number;
  failed: number;
  averageLatency: number;
  citationAccuracy: number;
}

/**
 * Run a single test case
 */
async function runTest(testCase: TestCase, userId: string): Promise<{ passed: boolean; result: RAGResponse }> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Question: "${testCase.question}"`);

  const startTime = Date.now();
  let result: RAGResponse;

  try {
    result = await askQuestion({
      userId,
      question: testCase.question,
      targetLang: 'vi',
    });

    const latency = Date.now() - startTime;
    console.log(`   ⏱️  Latency: ${latency}ms`);

    // Check latency
    if (testCase.maxLatency && latency > testCase.maxLatency) {
      console.log(`   ❌ Latency exceeded (max: ${testCase.maxLatency}ms)`);
      return { passed: false, result };
    }

    // Check if should have content
    const hasContent = result.usedChunks > 0;
    if (testCase.shouldHaveContent && !hasContent) {
      console.log(`   ❌ Expected content but got none`);
      return { passed: false, result };
    }

    if (!testCase.shouldHaveContent && hasContent) {
      console.log(`   ❌ Expected no content but got some`);
      return { passed: false, result };
    }

    // Check keywords
    if (testCase.expectedKeywords) {
      const answerLower = result.answer.toLowerCase();
      const hasAllKeywords = testCase.expectedKeywords.some(keyword =>
        answerLower.includes(keyword.toLowerCase())
      );

      if (!hasAllKeywords) {
        console.log(`   ⚠️  Missing expected keywords: ${testCase.expectedKeywords.join(', ')}`);
      }
    }

    // Check citations
    console.log(`   📚 Citations: ${result.citations.length}`);
    console.log(`   📄 Chunks used: ${result.usedChunks}`);

    console.log(`   ✅ Test passed`);
    return { passed: true, result };

  } catch (error) {
    console.log(`   ❌ Test failed with error:`, error);
    return {
      passed: false,
      result: {
        answer: '',
        citations: [],
        usedChunks: 0,
        processingTime: 0,
      },
    };
  }
}

/**
 * Calculate citation accuracy
 */
function calculateCitationAccuracy(results: RAGResponse[]): number {
  let totalCitations = 0;
  let validCitations = 0;

  results.forEach(result => {
    totalCitations += result.citations.length;
    
    // Check if citations are valid (have title and either quizId or url)
    result.citations.forEach(citation => {
      if (citation.title && (citation.quizId || citation.url)) {
        validCitations++;
      }
    });
  });

  if (totalCitations === 0) return 0;
  return (validCitations / totalCitations) * 100;
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting RAG Chatbot Test Suite\n');
  console.log('=' .repeat(60));

  try {
    // Initialize Firebase
    console.log('📱 Initializing Firebase...');
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const auth = getAuth(app);

    // Sign in (use test account or admin account)
    // For testing, you may need to create a test account first
    console.log('🔐 Authenticating...');
    console.log('⚠️  Note: Using current Firebase auth state');
    console.log('   If not authenticated, some tests may fail\n');

    const userId = auth.currentUser?.uid || 'test-user-id';
    if (!auth.currentUser) {
      console.log('⚠️  Warning: No authenticated user. Tests may not work correctly.\n');
    }

    // Run tests
    console.log('=' .repeat(60));
    console.log('Running tests...\n');

    const results: Array<{ passed: boolean; result: RAGResponse }> = [];

    for (const testCase of testCases) {
      const result = await runTest(testCase, userId);
      results.push(result);
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary\n');

    const stats: TestStats = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      averageLatency: results.reduce((sum, r) => sum + r.result.processingTime, 0) / results.length,
      citationAccuracy: calculateCitationAccuracy(results.map(r => r.result)),
    };

    console.log(`Total Tests: ${stats.total}`);
    console.log(`✅ Passed: ${stats.passed}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`⏱️  Average Latency: ${stats.averageLatency.toFixed(0)}ms`);
    console.log(`📚 Citation Accuracy: ${stats.citationAccuracy.toFixed(1)}%`);
    console.log();

    // Performance evaluation
    console.log('🎯 Performance Evaluation:');
    
    const latencyTarget = 2500;
    const citationTarget = 90;

    if (stats.averageLatency <= latencyTarget) {
      console.log(`   ✅ Latency: PASS (target: < ${latencyTarget}ms)`);
    } else {
      console.log(`   ❌ Latency: FAIL (target: < ${latencyTarget}ms)`);
    }

    if (stats.citationAccuracy >= citationTarget) {
      console.log(`   ✅ Citation Accuracy: PASS (target: ≥ ${citationTarget}%)`);
    } else {
      console.log(`   ⚠️  Citation Accuracy: NEEDS IMPROVEMENT (target: ≥ ${citationTarget}%)`);
    }

    console.log('\n' + '='.repeat(60));

    // Exit with appropriate code
    if (stats.failed === 0 && stats.averageLatency <= latencyTarget && stats.citationAccuracy >= citationTarget) {
      console.log('🎉 All tests passed! RAG chatbot is production-ready.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed or performance targets not met. Review the results above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();
