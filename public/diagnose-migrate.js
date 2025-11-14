// ===== MIGRATION SCRIPT =====
// CHỈ chạy nếu diagnostic script báo cần migrate!
// Copy TOÀN BỘ file này, paste vào Browser Console và nhấn Enter

(async () => {
  if (!window.__QUIZ_DIAGNOSTIC__ || !window.__QUIZ_DIAGNOSTIC__.needsMigration) {
    console.error('❌ Chạy diagnostic script trước!');
    return;
  }
  
  const { quizId, quizData } = window.__QUIZ_DIAGNOSTIC__;
  
  // Get Firebase instances
  const db = window.db || window.firestore;
  if (!db) {
    console.error('❌ Firebase không khả dụng!');
    return;
  }
  
  console.log('\n🔄 MIGRATION TOOL');
  console.log('=====================================\n');
  console.log(`Quiz: ${quizData.title}`);
  console.log(`Questions to migrate: ${quizData.questions.length}\n`);
  
  const confirm = window.confirm(
    `Migrate ${quizData.questions.length} questions?\n\n` +
    `Từ: quizzes/${quizId}.questions[] (array)\n` +
    `Đến: quizzes/${quizId}/questions/{id} (subcollection)\n\n` +
    `Dữ liệu cũ sẽ được GIỮ LẠI (backup).`
  );
  
  if (!confirm) {
    console.log('❌ Huỷ migration');
    return;
  }
  
  try {
    // Import Firestore functions
    const { collection, doc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const questions = quizData.questions;
    const questionsRef = collection(db, 'quizzes', quizId, 'questions');
    
    console.log(`Migrating ${questions.length} questions...`);
    
    // Batch write (max 500 per batch)
    const batchSize = 500;
    let migrated = 0;
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = questions.slice(i, Math.min(i + batchSize, questions.length));
      
      for (const question of chunk) {
        const questionId = question.id || doc(collection(db, '_')).id;
        const questionRef = doc(questionsRef, questionId);
        
        const questionData = {
          ...question,
          id: questionId,
          createdAt: question.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        batch.set(questionRef, questionData);
        migrated++;
      }
      
      await batch.commit();
      console.log(`✅ Migrated ${migrated}/${questions.length}`);
    }
    
    console.log('\n🎉 MIGRATION HOÀN THÀNH!');
    console.log(`Đã migrate ${migrated} câu hỏi`);
    console.log(`Location: quizzes/${quizId}/questions/`);
    console.log('\n💡 Refresh trang để thấy câu hỏi!\n');
    
  } catch (error) {
    console.error('\n❌ Migration thất bại:', error.message);
    console.error(error);
  }
})();
