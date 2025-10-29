# 🔥 Firebase Services Documentation

## 📦 Tổng quan

Dự án sử dụng **centralized service layer** để quản lý tất cả Firebase operations:
- ✅ **Type-safe** với TypeScript
- ✅ **Reusable** services
- ✅ **Consistent** API
- ✅ **Easy to test**
- ✅ **Ready for offline mode**

---

## 🗂️ Cấu trúc thư mục

```
src/services/firebase/
├── collections.ts        # Firestore collection names & constants
├── storage.ts           # Storage paths & validation
├── dataModels.ts        # TypeScript data models
├── firestoreService.ts  # Firestore CRUD operations
├── storageService.ts    # Storage upload/download operations
└── index.ts            # Single entry point
```

---

## 📋 Collections Constants

### File: `collections.ts`

```typescript
import { COLLECTIONS, compositeKeys } from '@/services/firebase';

// Collection names
COLLECTIONS.USERS               // 'users'
COLLECTIONS.QUIZZES             // 'quizzes'
COLLECTIONS.QUIZ_RESULTS        // 'quizResults'
COLLECTIONS.MULTIPLAYER_ROOMS   // 'multiplayer_rooms'

// Composite keys
const sessionId = compositeKeys.userQuizSession(quizId, userId);
// => "quiz123_user456"
```

**Benefits:**
- ✅ No typos
- ✅ Autocomplete
- ✅ Easy refactoring
- ✅ Centralized config

---

## 📁 Storage Paths

### File: `storage.ts`

```typescript
import { storagePaths, storageValidation } from '@/services/firebase';

// Generate paths
const avatarPath = storagePaths.userAvatar(userId);
// => "avatars/user123.jpg"

const coverPath = storagePaths.quizCover(quizId);
// => "covers/quiz456.jpg"

const videoPath = storagePaths.learningVideo(quizId, resourceId);
// => "resources/videos/quiz456/res_001.mp4"

// Validation
storageValidation.isValidImageType(file);  // true/false
storageValidation.isValidFileSize(file, 'VIDEO');  // true/false
```

**Benefits:**
- ✅ Consistent folder structure
- ✅ Type-safe path generation
- ✅ Built-in validation

---

## 📊 Data Models

### File: `dataModels.ts`

```typescript
import type { Quiz, QuizResult, UserProfile } from '@/services/firebase';

// Type-safe data structures
const quiz: Quiz = {
  id: 'quiz123',
  title: 'React Quiz',
  description: 'Test your React knowledge',
  questions: [...],
  resources: [...],
  // ... all fields with proper types
};

// Data cleaning
import { cleanQuizData, cleanQuestionData } from '@/services/firebase';

const cleanData = cleanQuizData(rawQuiz);
// => Removes undefined, applies defaults
```

**Benefits:**
- ✅ Full TypeScript support
- ✅ Autocomplete in IDE
- ✅ Compile-time type checking
- ✅ Data cleaning helpers

---

## 🔥 Firestore Service

### File: `firestoreService.ts`

### Basic CRUD

```typescript
import { firebase } from '@/services/firebase';

// GET by ID
const quiz = await firebase.quiz.getById('quiz123');

// GET many with query
const quizzes = await firebase.quiz.getMany([
  where('category', '==', 'react'),
  orderBy('createdAt', 'desc'),
  limit(10)
]);

// CREATE new
const newId = await firebase.quiz.create({
  title: 'New Quiz',
  description: 'Description',
  // ... other fields
});

// UPDATE existing
await firebase.quiz.update('quiz123', {
  title: 'Updated Title'
});

// DELETE
await firebase.quiz.delete('quiz123');
```

### Specialized Methods

```typescript
// Quiz Service
const published = await firebase.quiz.getPublishedQuizzes();
const byCategory = await firebase.quiz.getQuizzesByCategory('react');
const byCreator = await firebase.quiz.getQuizzesByCreator(userId);
const search = await firebase.quiz.searchQuizzes('react hooks');

await firebase.quiz.incrementAttempts(quizId);
await firebase.quiz.updateStats(quizId, score);

// Quiz Results Service
const userResults = await firebase.quizResults.getUserResults(userId);
const leaderboard = await firebase.quizResults.getQuizLeaderboard(quizId);
const global = await firebase.quizResults.getGlobalLeaderboard(100);

// User Service
await firebase.user.updateLastLogin(userId);
await firebase.user.updateRole(userId, 'creator');
await firebase.user.toggleActive(userId);

// Learning Session Service
const session = await firebase.learningSession.getSession(quizId, userId);
await firebase.learningSession.initSession(quizId, userId);
await firebase.learningSession.updateProgress(quizId, userId, resourceId, {...});

// Multiplayer Room Service
const room = await firebase.multiplayerRoom.getRoomByCode('ABC123');
const activeRooms = await firebase.multiplayerRoom.getActiveRooms();

// Favorites Service
const favs = await firebase.favorites.getUserFavorites(userId);
await firebase.favorites.addFavorite(userId, quizId);
await firebase.favorites.removeFavorite(userId, quizId);
```

### Pagination

```typescript
let lastDoc = null;

while (true) {
  const { data, lastDoc: newLastDoc } = await firebase.quiz.getPaginated(
    [where('isPublished', '==', true)],
    20,
    lastDoc
  );
  
  console.log('Page:', data);
  
  if (!newLastDoc) break;
  lastDoc = newLastDoc;
}
```

### Batch Operations

```typescript
await firebase.quiz.batchWrite([
  { type: 'update', docId: 'quiz1', data: { views: 10 } },
  { type: 'update', docId: 'quiz2', data: { views: 20 } },
  { type: 'delete', docId: 'quiz3' }
]);
```

---

## 📁 Storage Service

### File: `storageService.ts`

### Basic Upload

```typescript
import { firebase } from '@/services/firebase';

// Simple upload
const result = await firebase.storage.uploadFile(file, 'path/to/file.jpg');
console.log('URL:', result.url);

// Upload with progress
const result = await firebase.storage.uploadFile(
  file,
  'path/to/file.jpg',
  {
    onProgress: (progress) => {
      console.log(`Upload: ${progress}%`);
    },
    onComplete: (url) => {
      console.log('Done:', url);
    },
    compress: true,
    quality: 0.85
  }
);
```

### Specialized Uploads

```typescript
// Avatar (auto-compressed to 400x400)
const avatarUrl = await firebase.avatar.uploadAvatar(userId, file);

// Quiz Cover (compressed to 1200x630)
const cover = await firebase.quizCover.uploadCover(quizId, file);
console.log('Cover URL:', cover.url);

// Learning Resources
const video = await firebase.resource.uploadVideo(
  quizId,
  resourceId,
  videoFile,
  (progress) => setProgress(progress)
);

const pdf = await firebase.resource.uploadPDF(quizId, resourceId, pdfFile);
const image = await firebase.resource.uploadImage(quizId, resourceId, imageFile);
const audio = await firebase.resource.uploadAudio(quizId, resourceId, audioFile);
```

### Instant Upload (Preview + Background)

```typescript
const { previewUrl, finalUrl } = await firebase.storage.uploadWithInstantPreview(
  file,
  'path/to/file.jpg'
);

// Show preview immediately (1-3s)
setImageUrl(previewUrl);

// Get final compressed URL (3-5s)
const result = await finalUrl;
setImageUrl(result.url);
```

### Thumbnails

```typescript
// Get all thumbnail sizes (auto-generated by Extension)
const thumbnails = await firebase.storage.getThumbnailUrls('path/to/image.jpg');

console.log('Small:', thumbnails.small);    // 200x200
console.log('Medium:', thumbnails.medium);  // 400x400
console.log('Large:', thumbnails.large);    // 800x800
```

### Delete & Cleanup

```typescript
// Delete single file
await firebase.storage.deleteFile('path/to/file.jpg');

// Delete multiple files
await firebase.storage.deleteFiles([
  'file1.jpg',
  'file2.pdf',
  'file3.mp4'
]);

// Delete quiz and all related files
await firebase.quiz.delete(quizId);
await firebase.deleteQuizFiles(quizId);

// Cleanup temp files (older than 24h)
await firebase.cleanupTempFiles();
```

---

## 🎯 Usage Patterns

### Pattern 1: Create Quiz with Resources

```typescript
import { firebase, cleanQuizData } from '@/services/firebase';

// 1. Upload cover image
const cover = await firebase.quizCover.uploadCover(quizId, coverFile, {
  onProgress: (p) => setCoverProgress(p)
});

// 2. Upload learning resources
const videoResult = await firebase.resource.uploadVideo(
  quizId,
  'res_001',
  videoFile,
  (p) => setVideoProgress(p)
);

// 3. Clean quiz data
const quizData = cleanQuizData({
  title: 'React Hooks',
  description: 'Learn React Hooks',
  imageUrl: cover.url,
  questions: [...],
  resources: [
    {
      id: 'res_001',
      type: 'video',
      url: videoResult.url,
      title: 'React Hooks Tutorial'
    }
  ]
});

// 4. Save to Firestore
const quizId = await firebase.quiz.create(quizData);
```

### Pattern 2: Complete Quiz Flow

```typescript
// 1. Get quiz
const quiz = await firebase.quiz.getById(quizId);

// 2. Check learning session
const session = await firebase.learningSession.getSession(quizId, userId);

if (!session.ready) {
  // User must view resources first
  return showLearningMaterials();
}

// 3. Start quiz
await firebase.quiz.incrementAttempts(quizId);

// 4. Submit result
const result = await firebase.quizResults.create({
  quizId,
  userId,
  score: 85,
  completedAt: serverTimestamp()
});

// 5. Update quiz stats
await firebase.quiz.updateStats(quizId, 85);
```

### Pattern 3: Multiplayer Room

```typescript
// Create room
const roomId = await firebase.multiplayerRoom.create({
  code: 'ABC123',
  quizId: 'quiz123',
  hostId: userId,
  maxPlayers: 10,
  status: 'waiting'
});

// Join room
const room = await firebase.multiplayerRoom.getRoomByCode('ABC123');

// Get active rooms
const rooms = await firebase.multiplayerRoom.getActiveRooms();
```

### Pattern 4: Favorites

```typescript
// Check if favorited
const favs = await firebase.favorites.getUserFavorites(userId);
const isFavorited = favs.includes(quizId);

// Toggle favorite
if (isFavorited) {
  await firebase.favorites.removeFavorite(userId, quizId);
} else {
  await firebase.favorites.addFavorite(userId, quizId);
}
```

---

## 🔒 Security & Permissions

```typescript
import { hasPermission } from '@/services/firebase';

// Check if user can edit quiz
const canEdit = await hasPermission(
  currentUserId,
  quiz.createdBy,
  'creator' // required role
);

if (!canEdit) {
  throw new Error('Unauthorized');
}

await firebase.quiz.update(quizId, {...});
```

---

## 🧪 Testing

```typescript
import { firebase } from '@/services/firebase';

// Mock trong tests
jest.mock('@/services/firebase', () => ({
  firebase: {
    quiz: {
      getById: jest.fn(),
      create: jest.fn(),
      // ...
    },
    storage: {
      uploadFile: jest.fn(),
      // ...
    }
  }
}));

// Usage in test
(firebase.quiz.getById as jest.Mock).mockResolvedValue({
  id: 'quiz123',
  title: 'Test Quiz'
});
```

---

## 🚀 Offline Mode (Coming Soon)

```typescript
// Enable offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { db } from '@/firebase/config';

await enableIndexedDbPersistence(db);

// All firebase services will work offline automatically!
const quizzes = await firebase.quiz.getPublishedQuizzes();
// => Returns cached data if offline
```

---

## 📈 Performance Tips

1. **Use pagination** for large lists
2. **Cache frequently accessed data** in component state
3. **Denormalize data** to reduce queries (creator name, avatar)
4. **Use composite indexes** for complex queries
5. **Compress images** before upload (automatic with services)
6. **Clean up temp files** periodically
7. **Delete unused Storage files** when deleting Firestore docs

---

## ✅ Migration Checklist

Để migrate code cũ sang services mới:

- [ ] Replace direct `doc(db, 'collection', id)` với `firebase.collection.getById(id)`
- [ ] Replace `addDoc()` với `firebase.collection.create()`
- [ ] Replace `updateDoc()` với `firebase.collection.update()`
- [ ] Replace direct Storage uploads với `firebase.storage.uploadFile()`
- [ ] Use `cleanQuizData()` trước khi save
- [ ] Use `COLLECTIONS` constants thay vì hardcoded strings
- [ ] Use `storagePaths` helpers thay vì hardcoded paths
- [ ] Update imports: `import { firebase } from '@/services/firebase'`

---

## 🎉 Benefits Summary

**Before:**
```typescript
// ❌ Scattered, inconsistent code
const quizRef = doc(db, 'quizzes', id);  // Typo risk
const quizDoc = await getDoc(quizRef);
const quiz = { id: quizDoc.id, ...quizDoc.data() };

await addDoc(collection(db, 'quizes'), {...});  // Typo!

const storageRef = ref(storage, `covers/${quizId}.jpg`);  // Manual path
```

**After:**
```typescript
// ✅ Clean, type-safe, consistent
const quiz = await firebase.quiz.getById(id);  // Autocomplete!

await firebase.quiz.create({...});  // No typos possible

const cover = await firebase.quizCover.uploadCover(quizId, file);  // Easy!
```

---

## 🆘 Troubleshooting

**Issue:** Import error
```typescript
// ❌ Wrong
import { firebase } from '@/services/firebase/firestoreService';

// ✅ Correct
import { firebase } from '@/services/firebase';
```

**Issue:** TypeScript errors
```typescript
// Make sure to use proper types
import type { Quiz } from '@/services/firebase';

const quiz: Quiz = await firebase.quiz.getById(id);
```

**Issue:** Undefined values in Firestore
```typescript
// Always clean data before saving
import { cleanQuizData } from '@/services/firebase';

const cleanData = cleanQuizData(rawQuiz);
await firebase.quiz.create(cleanData);
```

---

🎯 **Ready to use!** All services are fully typed, tested, and production-ready!
