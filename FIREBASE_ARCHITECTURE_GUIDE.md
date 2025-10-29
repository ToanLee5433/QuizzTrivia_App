# 🏗️ Firebase Architecture Guide - Firestore vs Storage

## 📊 Tổng quan

Dự án QuizTrivia-App sử dụng 2 dịch vụ chính của Firebase:
- **Firestore Database**: NoSQL database cho structured data
- **Cloud Storage**: Object storage cho files (images, videos, PDFs, audio)

---

## 🎯 Nguyên tắc phân chia

### ✅ **Firestore Database** - Dùng cho:
1. **Structured Data** (có schema, cần query)
2. **Metadata** (thông tin mô tả)
3. **Relationships** (liên kết giữa entities)
4. **Real-time Updates** (cần sync)
5. **Small Data** (< 1MB per document)

### ✅ **Cloud Storage** - Dùng cho:
1. **Binary Files** (ảnh, video, audio, PDF)
2. **Large Files** (> 1MB)
3. **Static Assets** (không cần query)
4. **Media Content** (cần CDN, thumbnail generation)
5. **User Uploads** (file người dùng upload)

---

## 🗂️ Data Architecture Chi tiết

### 1️⃣ **Users Collection** (`/users/{userId}`)
**Firestore Only**
```typescript
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,  // ⚠️ Storage URL, not file
  role: 'user' | 'admin' | 'creator',
  createdAt: Timestamp,
  stats: {
    quizzesCreated: number,
    quizzesCompleted: number,
    totalScore: number
  },
  preferences: {
    language: string,
    theme: string
  }
}
```

**Storage References:**
- Avatar images: `gs://bucket/avatars/{userId}.jpg`
- Store URL in Firestore: `photoURL: "https://storage.googleapis.com/..."`

---

### 2️⃣ **Quizzes Collection** (`/quizzes/{quizId}`)
**Firestore + Storage**

#### Firestore Document:
```typescript
{
  id: string,
  title: string,
  description: string,
  category: string,
  difficulty: 'easy' | 'medium' | 'hard',
  duration: number,
  
  // ❌ KHÔNG lưu file binary trong Firestore
  // ✅ Chỉ lưu Storage URLs
  imageUrl: string | null,  // Cover image URL từ Storage
  
  questions: Question[],  // Array of questions
  
  // 🆕 Learning Resources
  resources: [
    {
      id: string,
      type: 'video' | 'pdf' | 'image' | 'audio' | 'link',
      title: string,
      description: string,
      
      // ✅ Storage URL hoặc external URL
      url: string,  // "gs://..." hoặc "https://youtube.com/..."
      
      required: boolean,
      threshold: {...},
      estimatedTime: number,
      order: number
    }
  ],
  
  createdBy: string,  // User ID reference
  createdAt: Timestamp,
  updatedAt: Timestamp,
  status: 'pending' | 'approved' | 'rejected',
  
  // Stats
  attempts: number,
  averageScore: number,
  totalPlayers: number
}
```

#### Storage Structure:
```
/quizzes/
  ├─ covers/
  │   └─ {quizId}.jpg               // Quiz cover images
  │
  └─ resources/
      ├─ videos/
      │   └─ {quizId}/{resourceId}.mp4
      │
      ├─ pdfs/
      │   └─ {quizId}/{resourceId}.pdf
      │
      ├─ images/
      │   └─ {quizId}/{resourceId}.jpg
      │
      └─ audios/
          └─ {quizId}/{resourceId}.mp3
```

**Storage URLs trong Firestore:**
```typescript
resources: [
  {
    id: 'res_001',
    type: 'video',
    url: 'https://firebasestorage.googleapis.com/.../videos/quiz123/res_001.mp4',
    // Hoặc external
    url: 'https://youtube.com/watch?v=...'
  },
  {
    id: 'res_002',
    type: 'pdf',
    url: 'https://firebasestorage.googleapis.com/.../pdfs/quiz123/res_002.pdf'
  }
]
```

---

### 3️⃣ **Questions** (Embedded in Quiz)
**Firestore Embedded Array**

```typescript
questions: [
  {
    id: string,
    text: string,
    type: 'multiple' | 'boolean' | 'image',
    
    // ✅ Image URL từ Storage (nếu có)
    imageUrl: string | null,
    
    answers: [
      {
        id: string,
        text: string,
        isCorrect: boolean,
        
        // ✅ Answer image URL (cho image-based questions)
        imageUrl: string | null
      }
    ],
    
    explanation: string,
    points: number
  }
]
```

**Storage:**
```
/questions/
  ├─ {quizId}/
  │   ├─ question_{questionId}.jpg    // Question images
  │   └─ answer_{answerId}.jpg        // Answer images
```

**Tại sao embed thay vì subcollection?**
- ✅ Load 1 lần (không cần multiple queries)
- ✅ Atomic updates (update cả quiz + questions cùng lúc)
- ✅ Offline support tốt hơn
- ⚠️ Giới hạn: Max 1MB per document (đủ cho ~200 questions)

---

### 4️⃣ **Quiz Results** (`/quizResults/{resultId}`)
**Firestore Only**

```typescript
{
  id: string,
  quizId: string,  // Reference to quiz
  userId: string,  // Reference to user
  
  score: number,
  totalQuestions: number,
  correctAnswers: number,
  timeSpent: number,  // seconds
  
  answers: [
    {
      questionId: string,
      selectedAnswerId: string,
      isCorrect: boolean,
      timeSpent: number
    }
  ],
  
  completedAt: Timestamp
}
```

**Tại sao không dùng Storage?**
- ❌ Results là structured data, cần query
- ✅ Query: "Top scores", "User's history", "Quiz analytics"
- ✅ Indexes: `userId + completedAt`, `quizId + score`

---

### 5️⃣ **Learning Sessions** (`/userQuizSessions/{sessionId}`)
**Firestore Only**

```typescript
{
  id: '{quizId}_{userId}',
  userId: string,
  quizId: string,
  
  // Progress tracking
  viewedResources: {
    'res_001': {
      completed: boolean,
      secondsWatched: number,
      watchPercent: number,
      pagesViewed: number[],
      lastActivityAt: Timestamp
    }
  },
  
  ready: boolean,  // Đủ điều kiện làm bài
  completionPercent: number,
  
  startedAt: Timestamp,
  updatedAt: Timestamp
}
```

**Tại sao không dùng Storage?**
- ❌ Session state cần real-time sync
- ✅ Query: "User progress", "Ready status"
- ✅ Update frequency: High (mỗi 5s khi xem video)

---

### 6️⃣ **Categories** (`/categories/{categoryId}`)
**Firestore Only**

```typescript
{
  id: string,
  name: string,
  description: string,
  
  // ✅ Icon URL từ Storage
  iconUrl: string,
  
  quizCount: number,
  order: number,
  createdAt: Timestamp
}
```

**Storage:**
```
/categories/
  └─ icons/
      └─ {categoryId}.svg
```

---

### 7️⃣ **Reviews** (`/reviews/{reviewId}`)
**Firestore Only**

```typescript
{
  id: string,
  quizId: string,
  userId: string,
  
  rating: number,  // 1-5
  comment: string,
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### 8️⃣ **Learning Events** (`/learningEvents/{eventId}`)
**Firestore Only** (Analytics)

```typescript
{
  id: string,
  userId: string,
  quizId: string,
  resourceId: string,
  
  eventType: 'video_play' | 'pdf_page_view' | 'resource_completed',
  metadata: {
    currentTime: number,
    pageNumber: number,
    // ... specific to event type
  },
  
  timestamp: Timestamp
}
```

---

## 📁 Complete Storage Folder Structure

```
Cloud Storage Root (gs://your-bucket-name/)
│
├─ avatars/                          # User avatars
│   └─ {userId}.jpg
│
├─ images/                           # Image uploads (general)
│   ├─ quizzes/
│   │   └─ {quizId}.jpg
│   ├─ questions/
│   │   └─ {quizId}_{questionId}.jpg
│   └─ temp/
│       └─ {tempId}.jpg              # Temporary uploads
│
├─ videos/                           # Video resources
│   └─ {quizId}/
│       └─ {resourceId}.mp4
│
├─ pdfs/                             # PDF documents
│   └─ {quizId}/
│       └─ {resourceId}.pdf
│
├─ audios/                           # Audio files
│   └─ {quizId}/
│       └─ {resourceId}.mp3
│
├─ covers/                           # Quiz cover images
│   └─ {quizId}.jpg
│
└─ thumbnails/                       # Auto-generated by Extension
    ├─ {filename}_200x200.jpg
    ├─ {filename}_400x400.jpg
    └─ {filename}_800x800.jpg
```

---

## 🔄 Data Flow Examples

### Example 1: Create Quiz with Resources

```typescript
// Step 1: Upload files to Storage
const coverUrl = await uploadQuizCover(coverFile);
const videoUrl = await uploadVideo(videoFile, quizId, 'res_001');
const pdfUrl = await uploadPDF(pdfFile, quizId, 'res_002');

// Step 2: Create Firestore document với URLs
await addDoc(collection(db, 'quizzes'), {
  title: 'React Basics',
  description: '...',
  imageUrl: coverUrl,  // ✅ Storage URL
  
  resources: [
    {
      id: 'res_001',
      type: 'video',
      url: videoUrl,     // ✅ Storage URL
      title: 'React Hooks Tutorial'
    },
    {
      id: 'res_002',
      type: 'pdf',
      url: pdfUrl,       // ✅ Storage URL
      title: 'React Cheat Sheet'
    },
    {
      id: 'res_003',
      type: 'link',
      url: 'https://youtube.com/watch?v=...',  // ✅ External URL
      title: 'Official React Docs'
    }
  ],
  
  questions: [...],
  createdBy: userId,
  createdAt: serverTimestamp()
});
```

### Example 2: Load Quiz for Display

```typescript
// Step 1: Get Firestore document
const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
const quiz = quizDoc.data();

// Step 2: URLs are already in document, no need to fetch from Storage
// Just use them directly!
<img src={quiz.imageUrl} />  // Cover image

quiz.resources.forEach(resource => {
  if (resource.type === 'video') {
    <video src={resource.url} />  // Video URL ready to use
  } else if (resource.type === 'pdf') {
    <embed src={resource.url} />  // PDF URL ready to use
  }
});
```

### Example 3: Delete Quiz (Cleanup both)

```typescript
// Step 1: Delete Firestore document
await deleteDoc(doc(db, 'quizzes', quizId));

// Step 2: Delete Storage files
await deleteObject(ref(storage, `covers/${quizId}.jpg`));
await deleteObject(ref(storage, `videos/${quizId}/res_001.mp4`));
await deleteObject(ref(storage, `pdfs/${quizId}/res_002.pdf`));
// ... delete all resources
```

---

## 🎨 Best Practices

### 1. **URL References**
✅ **DO:** Store Storage URLs in Firestore
```typescript
imageUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/images%2Fquiz123.jpg?alt=media&token=...'
```

❌ **DON'T:** Store Storage paths
```typescript
imagePath: 'images/quiz123.jpg'  // Bad: Need to call getDownloadURL() mỗi lần
```

### 2. **File Organization**
✅ **DO:** Organize by entity
```
/quizzes/covers/{quizId}.jpg
/quizzes/resources/videos/{quizId}/{resourceId}.mp4
```

❌ **DON'T:** Flat structure
```
/quiz123_cover.jpg
/res_001_video.mp4
```

### 3. **Metadata**
✅ **DO:** Store metadata in Firestore
```typescript
// Firestore
resources: [{
  id: 'res_001',
  type: 'video',
  url: 'https://...',
  duration: 600,        // ✅ Metadata
  size: 1024000,        // ✅ Metadata
  uploadedAt: Timestamp // ✅ Metadata
}]
```

❌ **DON'T:** Rely on Storage metadata
```typescript
// Storage metadata không dễ query
```

### 4. **Query Optimization**
✅ **DO:** Denormalize for read performance
```typescript
// Quiz document
{
  id: 'quiz123',
  title: 'React Quiz',
  createdBy: 'user456',
  creatorName: 'John Doe',      // ✅ Denormalized
  creatorAvatar: 'https://...'  // ✅ Denormalized
}
```

❌ **DON'T:** Always join
```typescript
// Expensive: Need 2 queries every time
const quiz = await getQuiz('quiz123');
const creator = await getUser(quiz.createdBy);
```

### 5. **File Size Limits**
- Firestore document: **Max 1MB**
- Storage file: **Max 5GB** (free tier)

✅ **DO:**
```typescript
// Questions array in quiz: < 1MB ✅
questions: [200 questions] // ~500KB → OK

// Large video in Storage: 50MB ✅
/videos/quiz123/intro.mp4
```

❌ **DON'T:**
```typescript
// Embed file binary in Firestore
questions: [
  {
    imageData: 'base64string...' // ❌ NEVER! Use Storage URL
  }
]
```

---

## 📊 Cost Optimization

### Firestore Costs:
- **Reads:** $0.06 per 100K documents
- **Writes:** $0.18 per 100K documents
- **Storage:** $0.18 per GB/month

**Strategy:**
- ✅ Embed related data (questions in quiz)
- ✅ Use subcollections only for large datasets
- ✅ Cache frequently accessed data
- ✅ Implement pagination

### Storage Costs:
- **Storage:** $0.026 per GB/month
- **Download:** $0.12 per GB
- **Upload:** Free

**Strategy:**
- ✅ Compress images before upload (use imageUploadService)
- ✅ Use thumbnails for previews
- ✅ Implement CDN (Firebase CDN included)
- ✅ Set lifecycle rules (delete temp files after 7 days)

---

## 🔒 Security Rules

### Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // Quizzes
    match /quizzes/{quizId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.createdBy 
                    || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Quiz Results
    match /quizResults/{resultId} {
      allow read: if request.auth.uid == resource.data.userId 
                  || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update, delete: if false;  // Results are immutable
    }
    
    // Learning Sessions
    match /userQuizSessions/{sessionId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### Storage Rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Avatars
    match /avatars/{userId}.jpg {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // Quiz covers
    match /covers/{quizId}.jpg {
      allow read: if true;
      allow write: if request.auth != null;  // Any authenticated user can upload
    }
    
    // Quiz resources
    match /videos/{quizId}/{resourceId}.mp4 {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /pdfs/{quizId}/{resourceId}.pdf {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /images/{quizId}/{resourceId}.jpg {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Thumbnails (generated by Extension)
    match /thumbnails/{filename} {
      allow read: if true;
      allow write: if false;  // Only Extension can write
    }
  }
}
```

---

## 🚀 Migration Plan (Nếu cần restructure)

### Phase 1: Audit Current Data
```bash
# Check Firestore usage
gcloud firestore operations list

# Check Storage usage
gsutil du -sh gs://your-bucket/*
```

### Phase 2: Create Backup
```bash
# Backup Firestore
gcloud firestore export gs://your-bucket/backups/

# Backup Storage
gsutil -m cp -r gs://your-bucket gs://backup-bucket
```

### Phase 3: Restructure
1. Create new folder structure in Storage
2. Migrate files
3. Update Firestore URLs
4. Update application code
5. Test thoroughly

### Phase 4: Cleanup
```bash
# Delete old files
gsutil -m rm -r gs://your-bucket/old-structure
```

---

## 📈 Monitoring & Analytics

### Firestore Metrics:
- Document reads/writes per hour
- Query performance
- Index usage
- Storage size growth

### Storage Metrics:
- Bandwidth usage
- File count by folder
- Average file size
- Download frequency

**Firebase Console:**
- Firebase Console → Firestore → Usage
- Firebase Console → Storage → Usage
- Set up alerts for quota limits

---

## ✅ Summary Checklist

### Firestore - Use for:
- [ ] User profiles
- [ ] Quiz metadata (title, description, category)
- [ ] Questions (embedded in quiz)
- [ ] Quiz results & analytics
- [ ] Learning session progress
- [ ] Reviews & ratings
- [ ] Categories
- [ ] Any structured data needing queries

### Storage - Use for:
- [ ] User avatars
- [ ] Quiz cover images
- [ ] Question images
- [ ] Answer images
- [ ] Video resources
- [ ] PDF documents
- [ ] Audio files
- [ ] Generated thumbnails
- [ ] Any binary files > 100KB

### Integration:
- [ ] Store Storage URLs in Firestore documents
- [ ] Never store file binary in Firestore
- [ ] Clean up Storage files when deleting Firestore documents
- [ ] Use Cloud Functions for automated cleanup
- [ ] Implement proper security rules for both
- [ ] Monitor costs and optimize

---

## 🎯 Recommended Structure for Your Project

```typescript
// Perfect data model
interface Quiz {
  // Firestore fields
  id: string;
  title: string;
  description: string;
  
  // Storage URL reference
  imageUrl: string | null;  // ← Points to Storage
  
  // Embedded structured data
  questions: Question[];    // ← In Firestore (< 1MB)
  
  // Resource URLs
  resources: Array<{
    id: string;
    type: ResourceType;
    url: string;            // ← Storage or external URL
    title: string;
    metadata: {...};        // ← In Firestore
  }>;
  
  // Analytics metadata
  stats: {
    attempts: number;
    avgScore: number;
  };
}
```

**This is the optimal structure for:**
- ✅ Fast queries
- ✅ Low cost
- ✅ Scalability
- ✅ Easy maintenance
- ✅ Good performance

🎉 **Your current architecture is correct!** Just follow these guidelines for new features.
