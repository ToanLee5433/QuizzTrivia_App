# 🔍 Quiz Questions Diagnostic Script

## Cách chạy:

1. Mở ứng dụng: http://localhost:5174/
2. **Đăng nhập** vào app
3. Mở **DevTools Console** (F12 → Console tab)
4. **Copy toàn bộ script dưới đây** và paste vào Console
5. Nhấn **Enter** để chạy

---

## SCRIPT (Copy từ đây đến hết):

```javascript
// ===== QUIZ QUESTIONS DIAGNOSTIC TOOL =====
// Paste vào Browser Console và nhấn Enter

(async () => {
  console.log('\n🔍 QUIZ QUESTIONS DIAGNOSTIC');
  console.log('=====================================\n');
  
  // Lấy Firebase từ app context
  const { getFirestore, doc, getDoc, collection, getDocs } = await import('firebase/firestore');
  const { getAuth } = await import('firebase/auth');
  
  const db = getFirestore();
  const auth = getAuth();
  
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
        console.log('\n💡 Chạy script migrate (xem tiếp bên dưới)');
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
      console.log('\n✅ HÀNH ĐỘNG: Chạy migration script bên dưới\n');
      
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
```

---

## Nếu phát hiện cần MIGRATE, chạy tiếp script này:

```javascript
// ===== MIGRATION SCRIPT =====
// CHỈ chạy nếu diagnostic script báo cần migrate!

(async () => {
  if (!window.__QUIZ_DIAGNOSTIC__ || !window.__QUIZ_DIAGNOSTIC__.needsMigration) {
    console.error('❌ Chạy diagnostic script trước!');
    return;
  }
  
  const { quizId, quizData } = window.__QUIZ_DIAGNOSTIC__;
  
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
    const { getFirestore, collection, doc, writeBatch } = await import('firebase/firestore');
    const db = getFirestore();
    
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
```

---

## Tóm tắt:

1. **Login vào app** → http://localhost:5174/
2. **Mở Console** (F12)
3. **Paste script đầu tiên** (Diagnostic) → Enter
4. **Đọc kết quả** trong console
5. Nếu báo cần migrate → **Paste script thứ 2** (Migration) → Enter
6. **Refresh trang** để thấy câu hỏi

✅ Script này sẽ TỰ ĐỘNG phát hiện và sửa lỗi!
