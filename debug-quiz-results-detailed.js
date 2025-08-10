// Debug script to check quiz results in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCMTuLO3o_wZ5fBdJGUG8Q_VmHHq3I3m2o",
  authDomain: "quiztrivia-app-ea15c.firebaseapp.com",
  projectId: "quiztrivia-app-ea15c",
  storageBucket: "quiztrivia-app-ea15c.firebasestorage.app",
  messagingSenderId: "967598984858",
  appId: "1:967598984858:web:f04b1b4b1b3c4e8a1b3d4e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugQuizResults() {
  try {
    console.log('🔍 Fetching recent quiz results...');
    
    const q = query(
      collection(db, 'quizResults'),
      orderBy('completedAt', 'desc'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    
    console.log(`📊 Found ${querySnapshot.size} recent results:`);
    
    querySnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Result ${index + 1} (ID: ${doc.id}) ---`);
      console.log('👤 User:', data.userName || data.userEmail);
      console.log('📝 Quiz ID:', data.quizId);
      console.log('🎯 Score:', data.score);
      console.log('✅ Correct Answers:', data.correctAnswers);
      console.log('📋 Total Questions:', data.totalQuestions);
      console.log('📅 Completed At:', data.completedAt?.toDate?.() || data.completedAt);
      console.log('🔢 Answers Count:', data.answers?.length || 0);
      
      if (data.answers && data.answers.length > 0) {
        const correctCount = data.answers.filter(a => a.isCorrect).length;
        console.log('✅ Answers with isCorrect=true:', correctCount);
        console.log('❌ Answers with isCorrect=false:', data.answers.length - correctCount);
        
        // Show first few answers for debugging
        console.log('📋 First 3 answers:');
        data.answers.slice(0, 3).forEach((answer, i) => {
          console.log(`  ${i+1}. Question: ${answer.questionId}, Selected: ${answer.selectedAnswerId}, Correct: ${answer.isCorrect}`);
        });
      }
      
      // Calculate percentage and compare
      if (typeof data.correctAnswers === 'number' && typeof data.totalQuestions === 'number' && data.totalQuestions > 0) {
        const calculatedPercentage = Math.round((data.correctAnswers / data.totalQuestions) * 100);
        console.log('🧮 Calculated %:', calculatedPercentage);
        console.log('💾 Stored score:', data.score);
        console.log('✅ Match:', calculatedPercentage === data.score ? 'YES' : 'NO');
      } else {
        console.log('⚠️ Missing correctAnswers or totalQuestions fields');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugQuizResults();
