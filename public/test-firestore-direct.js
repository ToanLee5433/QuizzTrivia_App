// PASTE VÀO BROWSER CONSOLE để test trực tiếp Firestore query

(async () => {
  console.log('🔍 DIRECT FIRESTORE TEST');
  console.log('========================\n');
  
  const db = window.firestore || getFirestore();
  const quizId = 'mGEoMyTxuttzEKxHy9CM'; // Thay bằng quiz ID của bạn
  
  console.log('Testing quiz ID:', quizId);
  console.log('Current user:', auth.currentUser?.uid);
  console.log('');
  
  // Test 1: Get quiz metadata
  console.log('📋 TEST 1: Get Quiz Metadata');
  try {
    const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
    if (quizDoc.exists()) {
      const data = quizDoc.data();
      console.log('✅ Quiz found:', data.title);
      console.log('   Status:', data.status);
      console.log('   Visibility:', data.visibility);
      console.log('   Created by:', data.createdBy);
      console.log('   Is owner:', auth.currentUser?.uid === data.createdBy);
    } else {
      console.error('❌ Quiz not found!');
      return;
    }
  } catch (err) {
    console.error('❌ Error getting quiz:', err.message);
    return;
  }
  console.log('');
  
  // Test 2: Query questions subcollection
  console.log('📝 TEST 2: Query Questions Subcollection');
  try {
    const questionsRef = collection(db, 'quizzes', quizId, 'questions');
    console.log('Path:', `quizzes/${quizId}/questions`);
    
    const questionsSnap = await getDocs(questionsRef);
    
    console.log('Query result:', {
      size: questionsSnap.size,
      empty: questionsSnap.empty,
      docs_length: questionsSnap.docs.length,
      metadata: questionsSnap.metadata
    });
    
    if (questionsSnap.empty) {
      console.error('❌ Query returned EMPTY!');
      console.log('');
      console.log('🔍 Debugging steps:');
      console.log('1. Check Firestore Console manually');
      console.log('2. Verify subcollection name is "questions" (not "question")');
      console.log('3. Check if documents exist in subcollection');
      console.log('4. Try listing all collections:');
      console.log('   const collections = await listCollections(doc(db, "quizzes", quizId));');
    } else {
      console.log('✅ Found', questionsSnap.docs.length, 'questions:');
      questionsSnap.docs.forEach((doc, i) => {
        console.log(`   Q${i+1} (${doc.id}):`, doc.data().questionText?.substring(0, 40) + '...');
      });
    }
  } catch (err) {
    console.error('❌ Error querying questions:', err.code, err.message);
    if (err.code === 'permission-denied') {
      console.log('🔒 PERMISSION DENIED!');
      console.log('Firestore rules are blocking the read.');
    }
  }
  console.log('');
  
  // Test 3: Try alternative paths
  console.log('🔄 TEST 3: Check Alternative Structures');
  
  // Check if questions in parent doc
  const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
  const data = quizDoc.data();
  if ('questions' in data) {
    console.log('⚠️ Found "questions" field in parent document!');
    console.log('   Type:', Array.isArray(data.questions) ? 'Array' : typeof data.questions);
    console.log('   Length:', data.questions?.length || 0);
    console.log('');
    console.log('🔧 This is OLD structure!');
    console.log('   Expected: quizzes/{id}/questions/{qid}  (subcollection)');
    console.log('   Found:    quizzes/{id}.questions[]       (field)');
    console.log('');
    if (data.questions?.length > 0) {
      console.log('✅ Questions exist in parent doc:', data.questions.length);
      console.log('❌ But code expects subcollection!');
      console.log('');
      console.log('🔧 FIX OPTIONS:');
      console.log('1. Migrate questions to subcollection');
      console.log('2. Update code to read from parent doc');
    }
  } else {
    console.log('✅ No "questions" field in parent (correct structure)');
  }
  
  console.log('');
  console.log('========================');
  console.log('TEST COMPLETE');
})();
