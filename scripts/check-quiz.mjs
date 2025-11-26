// Script to check quiz data from Firebase
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Load service account from functions folder
const serviceAccount = JSON.parse(
  readFileSync('./functions/datn-quizapp-firebase-adminsdk-fbsvc-2ca4f24f32.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://datn-quizapp-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function checkQuiz(quizId) {
  console.log(`\n🔍 Checking quiz: ${quizId}\n`);
  
  // Get quiz metadata
  const quizDoc = await db.collection('quizzes').doc(quizId).get();
  
  if (!quizDoc.exists) {
    console.log('❌ Quiz not found!');
    return;
  }
  
  const quizData = quizDoc.data();
  console.log('📋 Quiz Metadata:');
  console.log(`   Title: ${quizData.title}`);
  console.log(`   Status: ${quizData.status}`);
  console.log(`   Visibility: ${quizData.visibility}`);
  console.log(`   QuestionCount (metadata): ${quizData.questionCount || quizData.stats?.questionCount || 'N/A'}`);
  
  // Check if questions are embedded in quiz doc
  if (quizData.questions && Array.isArray(quizData.questions)) {
    console.log(`\n📦 Embedded Questions in document: ${quizData.questions.length}`);
  }
  
  // Get questions from subcollection
  const questionsSnap = await db.collection('quizzes').doc(quizId).collection('questions').get();
  console.log(`\n📂 Questions Subcollection: ${questionsSnap.size} documents`);
  
  if (questionsSnap.size > 0) {
    questionsSnap.forEach((doc, i) => {
      const q = doc.data();
      console.log(`   ${i + 1}. [${doc.id}] ${q.question?.substring(0, 50)}...`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

async function listFeaturedQuizzes() {
  console.log('\n🌟 Checking Featured/Approved Quizzes:\n');
  
  const approvedSnap = await db.collection('quizzes')
    .where('status', '==', 'approved')
    .limit(10)
    .get();
  
  console.log(`Found ${approvedSnap.size} approved quizzes:\n`);
  
  for (const doc of approvedSnap.docs) {
    const data = doc.data();
    const questionsSnap = await db.collection('quizzes').doc(doc.id).collection('questions').get();
    
    console.log(`📘 ${data.title}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Questions (subcollection): ${questionsSnap.size}`);
    console.log(`   Questions (embedded): ${data.questions?.length || 0}`);
    console.log('');
  }
}

// Run
const quizId = process.argv[2] || 'mGEoMyTxuttzEKxHy9CM';

await checkQuiz(quizId);
await listFeaturedQuizzes();

process.exit(0);
