# 🔧 FIX CHATBOT ERROR - "Failed to process question"

## ✅ ĐÃ FIX I18N

### **1. English (EN) - ✅ Done**
- Added all `chatbot.*` keys
- Added `placeholders.askQuestion`

### **2. Vietnamese (VI) - ✅ Done** 
- Added `placeholders.askQuestion`

---

## ❌ VẤN ĐỀ CHÍNH: VECTOR INDEX CHƯA CÓ

Error: `FirebaseError: Failed to process question. Please try again later.`

**Nguyên nhân:** Vector index chưa được build/upload lên Cloud Storage

---

## 🛠️ FIX NGAY

### **Bước 1: Build Vector Index**

```bash
# Tạo folder data nếu chưa có
mkdir data

# Build index từ Firestore quizzes
npm run build:index
```

**Script sẽ:**
1. Đọc tất cả approved quizzes từ Firestore
2. Tạo embeddings với Google AI
3. Lưu vào `data/vector-index.json`

### **Bước 2: Upload lên Cloud Storage**

```bash
# Upload index lên Firebase Storage
npm run upload:index
```

**Script sẽ:**
1. Đọc `data/vector-index.json`
2. Upload lên `rag/indices/vector-index.json` trong Storage
3. Tạo backup nếu index cũ đã tồn tại

### **Bước 3: Test Chatbot**

1. Refresh app
2. Login
3. Click chatbot button
4. Ask: "Quiz về toán học là gì?"

---

## 🔍 DEBUG LOGS

### **Check Firebase Functions Logs:**

```bash
# Real-time logs
firebase functions:log --only askRAG

# Last 50 logs
firebase functions:log --only askRAG --limit 50
```

### **Expected logs khi hoạt động:**
```
✅ Vector index loaded: X chunks
✅ Question embedded
✅ Top 4 similar chunks found
✅ Generated answer
✅ Response sent
```

### **Error logs nếu thiếu index:**
```
⚠️ Vector index not found in Storage
❌ Cannot process question without index
```

---

## 📝 SCRIPTS TRONG PACKAGE.JSON

Đảm bảo có các scripts sau:

```json
{
  "scripts": {
    "build:index": "tsx scripts/buildIndex.ts",
    "upload:index": "tsx scripts/uploadIndexToStorage.ts",
    "resync:index": "tsx scripts/resyncIndex.ts"
  }
}
```

---

## 🎯 CHECKLIST

- [x] Add chatbot i18n EN
- [x] Add chatbot i18n VI
- [x] Add placeholders.askQuestion
- [ ] Build vector index: `npm run build:index`
- [ ] Upload to Storage: `npm run upload:index`
- [ ] Test chatbot
- [ ] Verify logs

---

## 💡 NẾUU VẪN LỖI

### **1. Check Firebase Storage Rules**

Vào Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /rag/indices/{file} {
      // Allow read for authenticated users
      allow read: if request.auth != null;
      
      // Allow write for Cloud Functions
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### **2. Check askRAG Function**

```bash
# List functions
firebase functions:list | grep askRAG

# Should see:
# askRAG(us-central1)
```

### **3. Check Index File Exists**

```bash
# Check local
ls data/vector-index.json

# Check in Firebase Console → Storage
# Path: rag/indices/vector-index.json
```

### **4. Manual Test askRAG**

Trong browser console:

```javascript
const functions = firebase.functions();
const askRAG = functions.httpsCallable('askRAG');

askRAG({ 
  question: "Test question", 
  topK: 4, 
  targetLang: 'vi' 
})
.then(result => console.log('✅ Success:', result))
.catch(error => console.error('❌ Error:', error));
```

---

## 🚀 QUICK FIX

```bash
# All in one
npm run build:index && npm run upload:index

# Then test chatbot
```

---

## 📊 STATUS

| Component | Status | Action |
|-----------|--------|--------|
| **I18N EN** | ✅ Fixed | Added all keys |
| **I18N VI** | ✅ Fixed | Added placeholder |
| **Vector Index** | ❌ Missing | Build & upload |
| **askRAG Function** | ✅ Deployed | Working |
| **Chatbot Test** | ⏳ Pending | After build index |

---

**Next:** Run `npm run build:index && npm run upload:index` để fix!
