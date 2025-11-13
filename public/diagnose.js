// ===== QUIZ QUESTIONS DIAGNOSTIC TOOL =====
// Copy TOÀN BỘ file này, paste vào Browser Console và nhấn Enter

(async () => {
  console.log('\n🔍 QUIZ QUESTIONS DIAGNOSTIC');
  console.log('=====================================\n');
  
  // Get Firebase instances from window (already loaded by app)
  const db = window.db || window.firestore;
  const auth = window.auth;
  
  if (!db || !auth) {
    console.error('❌ Firebase chưa được khởi tạo! Vui lòng mở trang từ app đang chạy.');
    return;
  }
  
  // Thay đổi Quiz ID ở đây nếu cần
  const quizId = 'mGEoMyTxuttzEKxHy9CM';
  
  console.log('Quiz ID:', quizId);
  console.log('User:', auth.currentUser?.email || 'NOT LOGGED IN');
  console.log('');
  
  if (!auth.currentUser) {
    console.error('❌ Chưa đăng nhập! Vui lòng login trước.');
    return;
  }
  
  try {
    // Import Firestore functions
    const { doc, getDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    // TEST 1: Get quiz metadata
    console.log('📋 TEST 1: Quiz Metadata');
    console.log('─────────────────────────');
    
    const quizRef = doc(db, 'quizzes', quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      console.error('❌ Quiz không tồn tại:', quizId);
      return;
    }
    
    const quizData = quizDoc.data();
    console.log('✅ Quiz:', quizData.title);
    console.log('   Status:', quizData.status);
    console.log('   Visibility:', quizData.visibility);
    console.log('   Created by:', quizData.createdBy);
    console.log('   Is owner:', auth.currentUser.uid === quizData.createdBy);
    
    // Kiểm tra xem questions có nằm trong parent doc không
    const hasQuestionsField = 'questions' in quizData;
    console.log('   Has "questions" field:', hasQuestionsField);
    
    if (hasQuestionsField) {
      console.log('\n⚠️  PHÁT HIỆN: "questions" field trong parent document!');
      console.log('   Type:', Array.isArray(quizData.questions) ? 'Array' : typeof quizData.questions);
      
      if (Array.isArray(quizData.questions)) {
        console.log('   Length:', quizData.questions.length);
        console.log('\n💥 ROOT CAUSE: Cấu trúc dữ liệu CŨ!');
        console.log('   Expected: quizzes/{id}/questions/{qid}  (subcollection)');
        console.log('   Found:    quizzes/{id}.questions[]       (array field)');
        console.log('\n📊 Sample questions:');
        quizData.questions.slice(0, 3).forEach((q, i) => {
          console.log(`   Q${i+1}:`, q.questionText?.substring(0, 50) + '...');
        });
      }
    }
    
    console.log('\n');
    
    // TEST 2: Query questions subcollection
    console.log('📝 TEST 2: Questions Subcollection');
    console.log('─────────────────────────────────');
    
    const questionsRef = collection(db, 'quizzes', quizId, 'questions');
    console.log('Path:', `quizzes/${quizId}/questions`);
    
    const questionsSnap = await getDocs(questionsRef);
    
    console.log('Query result:', {
      size: questionsSnap.size,
      empty: questionsSnap.empty,
      docs: questionsSnap.docs.length
    });
    
    if (questionsSnap.empty) {
      console.error('\n❌ Subcollection RỖNG!');
      
      if (hasQuestionsField && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
        console.log('\n🔧 GIẢI PHÁP:');
        console.log(`   1. Questions đang ở parent doc: ${quizData.questions.length} câu`);
        console.log('   2. Subcollection rỗng: 0 câu');
        console.log('   3. CẦN MIGRATE từ parent doc → subcollection');
        console.log('\n💡 Chạy script migrate (file diagnose-migrate.js)');
      }
    } else {
      console.log(`\n✅ Tìm thấy ${questionsSnap.size} questions trong subcollection`);
      questionsSnap.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`   Q${i+1} (${doc.id}):`, data.questionText?.substring(0, 50) + '...');
      });
    }
    
    // SUMMARY
    console.log('\n=====================================');
    console.log('🎯 KẾT QUẢ CHẨN ĐOÁN');
    console.log('=====================================\n');
    
    if (hasQuestionsField && Array.isArray(quizData.questions) && quizData.questions.length > 0 && questionsSnap.empty) {
      console.log('🔴 LỖI: CẤU TRÚC DỮ LIỆU CŨ');
      console.log(`   Parent doc: ${quizData.questions.length} câu hỏi`);
      console.log('   Subcollection: 0 câu hỏi');
      console.log('\n✅ HÀNH ĐỘNG: Chạy migration script\n');
      
      // Store for migration
      window.__QUIZ_DIAGNOSTIC__ = {
        quizId,
        quizData,
        needsMigration: true
      };
      
    } else if (questionsSnap.empty) {
      console.log('🔴 LỖI: KHÔNG CÓ QUESTIONS');
      console.log('   Quiz này chưa có câu hỏi nào.\n');
      
    } else {
      console.log('✅ KHÔNG CÓ VẤN ĐỀ VỚI DỮ LIỆU');
      console.log(`   Questions trong subcollection: ${questionsSnap.size}`);
      console.log('\n💡 Nếu app vẫn hiện 0 questions → Lỗi ở APPLICATION CODE\n');
    }
    
  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    console.error(error);
  }
})();
