# 🔍 QUIZ DEBUG GUIDE - Cannot Load Questions

## 📊 Phân tích vấn đề

### ❌ Error Message
```
Không thể tải câu hỏi
Quiz này chưa có câu hỏi hoặc bạn chưa có quyền truy cập
```

### 🔎 Root Cause Analysis

Từ console logs:
```
useQuizData.ts:287 🔍 Using currentQuiz from Redux: Test AI tạo quiz
useQuizData.ts:225 ✅ Loaded questions: 0  ← VẤN ĐỀ Ở ĐÂY!
useQuizSettings.ts:84 🎮 useQuizSettings - Quiz: Test AI tạo quiz Questions: 0
index.tsx:247 Uncaught TypeError: Cannot read properties of undefined (reading 'id')
```

**Phát hiện:**
1. ✅ Metadata load thành công (`Test AI tạo quiz`)
2. ✅ Questions subcollection accessible (không permission denied)
3. ❌ **Questions count = 0** → Collection RỖNG!
4. ❌ `currentQuestion` undefined → Crash

---

## 🧩 Kiến trúc Quiz trong Firestore

### Cấu trúc hiện tại (ĐÚNG):
```
quizzes/{quizId}                          ← METADATA
  - title, description, difficulty...
  - visibility, status (draft/approved)
  - createdBy, stats...

quizzes/{quizId}/questions/{questionId}   ← NỘI DUNG ĐỀ (BẢO VỆ)
  - questionText, answers[]
  - correctAnswer, points...
```

### Firestore Rules (ĐÃ KIỂM TRA - ĐÚNG):
```javascript
match /quizzes/{quizId}/questions/{qid} {
  allow read: if signedIn() && (
    // Admin can read all
    isAdmin() ||
    // Owner can read their own quiz questions
    quizDoc(quizId).data.createdBy == request.auth.uid ||
    // Regular users: only approved + (public OR unlocked)
    (quizDoc(quizId).data.status == 'approved' && (
      quizDoc(quizId).data.visibility == "public" ||
      (quizDoc(quizId).data.visibility == "password" && hasAccess(quizId))
    ))
  );
}
```

**Rules cho phép đọc khi:**
- User = Admin (full access)
- User = Owner (quiz của họ)
- Quiz approved + (public HOẶC đã unlock password)

---

## 🔧 Possible Causes (Nguyên nhân có thể)

### 1. ❌ Quiz chưa có questions trong Firestore
**Triệu chứng:** `questionsSnap.docs.length === 0`

**Nguyên nhân:**
- Quiz mới tạo chưa thêm câu hỏi
- Questions bị xóa nhầm
- AI Generator chưa tạo questions
- Migration/Import lỗi

**Cách check:**
```javascript
// Chạy trong browser console
const db = getFirestore();
const questionsRef = collection(db, 'quizzes', 'YOUR_QUIZ_ID', 'questions');
const snap = await getDocs(questionsRef);
console.log('Questions count:', snap.docs.length);
snap.docs.forEach(doc => console.log(doc.id, doc.data()));
```

**Giải pháp:**
- Vào Firebase Console → Firestore
- Navigate: `quizzes/{quizId}/questions`
- Kiểm tra có documents không
- Nếu rỗng → Thêm câu hỏi từ CreateQuizPage

---

### 2. ❌ Quiz status != 'approved' (chưa duyệt)
**Triệu chứng:** Permission denied for regular users

**Nguyên nhân:**
- Quiz đang ở status `draft` hoặc `pending`
- Chỉ admin/owner mới xem được
- User thường không có quyền

**Cách check:**
```javascript
const quizDoc = await getDoc(doc(db, 'quizzes', 'YOUR_QUIZ_ID'));
console.log('Quiz status:', quizDoc.data().status);
console.log('Created by:', quizDoc.data().createdBy);
console.log('Current user:', auth.currentUser.uid);
```

**Giải pháp:**
- Admin: Vào Admin Panel → Approve quiz
- Hoặc change status trong Firestore Console:
  ```
  quizzes/{quizId}
    status: "approved"  ← Change từ "draft"
  ```

---

### 3. ❌ Visibility = "password" nhưng chưa unlock
**Triệu chứng:** Permission denied vì chưa có access token

**Cách check:**
```javascript
const quizDoc = await getDoc(doc(db, 'quizzes', 'YOUR_QUIZ_ID'));
console.log('Visibility:', quizDoc.data().visibility);

const accessDoc = await getDoc(doc(db, 'quizzes', 'YOUR_QUIZ_ID', 'access', auth.currentUser.uid));
console.log('Has access:', accessDoc.exists());
```

**Giải pháp:**
- User: Nhập password ở Preview page
- Hoặc change visibility trong Firestore:
  ```
  quizzes/{quizId}
    visibility: "public"  ← Change từ "password"
  ```

---

### 4. ❌ User chưa đăng nhập
**Triệu chứng:** `request.auth` null → All rules fail

**Cách check:**
```javascript
console.log('User logged in:', !!auth.currentUser);
console.log('User UID:', auth.currentUser?.uid);
```

**Giải pháp:**
- Login trước khi access quiz
- Check `ProtectedRoute` wrapper

---

## 🛠️ Fixed Issues (Đã fix)

### ✅ 1. Firestore Timestamp Serialization
**Lỗi:** Redux non-serializable warning
```
A non-serializable value was detected in the path: `payload.stats.lastUpdated`
Value: _Timestamp {seconds: 1763020921, nanoseconds: 136000000}
```

**Fix:** Convert Timestamp → ISO String trước khi dispatch
```typescript
const serializeQuiz = (quiz: any): Quiz => {
  const serialized = { ...quiz };
  
  if (serialized.stats?.lastUpdated?.toDate) {
    serialized.stats.lastUpdated = serialized.stats.lastUpdated.toDate().toISOString();
  }
  
  if (serialized.createdAt?.toDate) {
    serialized.createdAt = serialized.createdAt.toDate().toISOString();
  }
  
  if (serialized.updatedAt?.toDate) {
    serialized.updatedAt = serialized.updatedAt.toDate().toISOString();
  }
  
  return serialized;
};
```

### ✅ 2. Empty Questions Array Safety Check
**Lỗi:** `Cannot read properties of undefined (reading 'id')`
```typescript
const currentQuestion = quizWithSettings.questions[session.currentQuestionIndex];
// currentQuestion undefined → crash at line 247
```

**Fix:** Add safety check
```typescript
if (!currentQuestion || !quizWithSettings.questions.length) {
  return <ErrorScreen message={t('quiz.errors.noQuestions')} />;
}
```

### ✅ 3. i18n Translation Keys
**Fix:** Added missing keys
```json
{
  "quiz": {
    "errors": {
      "noQuestions": "Không thể tải câu hỏi",
      "noQuestionsDescription": "Quiz này chưa có câu hỏi..."
    },
    "actions": {
      "exit": "Thoát",
      "previous": "Câu trước",
      "next": "Câu tiếp",
      "submit": "Nộp bài"
    }
  },
  "common": {
    "goBack": "Quay lại"
  }
}
```

---

## 🧪 Debug Steps (Các bước debug)

### Step 1: Check Firestore Console
1. Open Firebase Console
2. Navigate: Firestore Database → `quizzes/{quizId}`
3. **Check metadata:**
   - `status` = "approved" ✓
   - `visibility` = "public" hoặc "password" ✓
   - `createdBy` = valid UID ✓
4. **Check questions subcollection:**
   - Expand `questions` node
   - **Có ít nhất 1 document?** ← QUAN TRỌNG!
   - Mỗi question có: `questionText`, `answers`, `correctAnswer`

### Step 2: Check Browser Console
```javascript
// Paste vào Console và check logs
const checkQuiz = async (quizId) => {
  const db = getFirestore();
  
  // 1. Check metadata
  const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
  console.log('📋 Quiz Metadata:', {
    exists: quizDoc.exists(),
    status: quizDoc.data()?.status,
    visibility: quizDoc.data()?.visibility,
    createdBy: quizDoc.data()?.createdBy,
    title: quizDoc.data()?.title
  });
  
  // 2. Check questions
  try {
    const questionsRef = collection(db, 'quizzes', quizId, 'questions');
    const questionsSnap = await getDocs(questionsRef);
    console.log('📝 Questions:', {
      count: questionsSnap.docs.length,
      ids: questionsSnap.docs.map(d => d.id)
    });
    
    if (questionsSnap.docs.length === 0) {
      console.error('❌ PROBLEM: Quiz has NO questions in Firestore!');
    }
  } catch (err) {
    console.error('❌ Error loading questions:', err.code, err.message);
  }
  
  // 3. Check access
  const user = auth.currentUser;
  console.log('👤 Current User:', {
    uid: user?.uid,
    isOwner: user?.uid === quizDoc.data()?.createdBy
  });
};

// Run check
await checkQuiz('YOUR_QUIZ_ID');
```

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Filter: Firestore requests
3. Look for: `quizzes/{quizId}/questions`
4. Check response:
   - Status 200 OK ✓ → Permission OK
   - Empty documents [] ❌ → No questions!
   - Status 403 Forbidden ❌ → Permission denied

---

## 🚀 Solutions (Giải pháp)

### Solution 1: Add Questions to Quiz
**Nếu quiz RỖNG (không có questions):**

1. **Via CreateQuizPage:**
   - Navigate: `/quiz/{quizId}/edit/advanced`
   - Click "Thêm câu hỏi"
   - Fill form → Save

2. **Via AI Generator:**
   - Navigate: `/quiz/create/ai`
   - Enter prompt → Generate
   - Questions tự động tạo

3. **Via Firestore Console (Admin):**
   - Navigate: `quizzes/{quizId}/questions`
   - Click "Add document"
   - Manual entry:
     ```json
     {
       "questionText": "Câu hỏi mẫu?",
       "answers": [
         { "id": "a1", "text": "Đáp án 1" },
         { "id": "a2", "text": "Đáp án 2" }
       ],
       "correctAnswer": "a1",
       "points": 10
     }
     ```

### Solution 2: Approve Quiz
**Nếu quiz status = draft:**

1. **Admin Panel:**
   - Navigate: `/admin/quizzes`
   - Find quiz → Click "Phê duyệt"

2. **Firestore Console:**
   - Edit `quizzes/{quizId}`:
     ```
     status: "approved"
     ```

### Solution 3: Make Public or Unlock
**Nếu visibility = password:**

1. **Change to public:**
   - Edit quiz → Settings → Visibility = Public

2. **Unlock with password:**
   - Preview page → Enter password

---

## 📝 Testing Checklist

After fixes, verify:

- [ ] Quiz có ít nhất 1 question trong Firestore
- [ ] Quiz status = "approved"
- [ ] User đã login
- [ ] Visibility = "public" HOẶC đã unlock password
- [ ] Console không có errors màu đỏ
- [ ] Log shows: `✅ Loaded questions: [number > 0]`
- [ ] QuizPage loads successfully
- [ ] Questions hiển thị đúng
- [ ] Navigation works (Previous/Next)
- [ ] Submit quiz works

---

## 🎯 Quick Fix Command

```javascript
// Paste in Console - Check quiz health
(async () => {
  const quizId = window.location.pathname.split('/')[2]; // Get from URL
  console.log('🔍 Checking quiz:', quizId);
  
  const db = getFirestore();
  const quiz = await getDoc(doc(db, 'quizzes', quizId));
  
  if (!quiz.exists()) {
    console.error('❌ Quiz not found!');
    return;
  }
  
  const data = quiz.data();
  const questionsSnap = await getDocs(collection(db, 'quizzes', quizId, 'questions'));
  
  console.log('📊 Quiz Health Check:');
  console.log('  Title:', data.title);
  console.log('  Status:', data.status, data.status === 'approved' ? '✅' : '❌');
  console.log('  Visibility:', data.visibility);
  console.log('  Questions:', questionsSnap.docs.length, questionsSnap.docs.length > 0 ? '✅' : '❌ NO QUESTIONS!');
  console.log('  Owner:', data.createdBy);
  console.log('  Current User:', auth.currentUser?.uid);
  console.log('  Is Owner:', auth.currentUser?.uid === data.createdBy ? '✅' : '❌');
  
  if (questionsSnap.docs.length === 0) {
    console.error('⚠️ CRITICAL: This quiz has NO questions! Add questions first.');
  }
})();
```

---

## 📞 Next Steps

1. **Run health check script above**
2. **If questions = 0:**
   - Add questions via CreateQuizPage
   - Or use AI Generator
3. **If status != approved:**
   - Approve via Admin Panel
4. **Test again**
5. **Report findings**

**Status:** 🔄 Waiting for user to check quiz in Firestore
