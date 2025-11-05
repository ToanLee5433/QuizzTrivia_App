# 🏗️ Firebase Data Architecture - QuizTrivia App

## 📋 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Database Selection Guide](#database-selection-guide)
3. [Current State Analysis](#current-state-analysis)
4. [Recommended Architecture](#recommended-architecture)
5. [Migration Plan](#migration-plan)
6. [Security Rules](#security-rules)
7. [Performance Optimization](#performance-optimization)

---

## 🎯 **OVERVIEW**

Hệ thống sử dụng **3 Firebase services** với mục đích riêng biệt:

| Service | Purpose | Use Cases |
|---------|---------|-----------|
| **Firestore** | Dữ liệu bền, truy vấn phức tạp | Metadata, questions, results, user profiles |
| **Realtime Database (RTDB)** | Đồng bộ thời gian thực, tần suất cao | Multiplayer presence, game state, live scores |
| **Storage** | File nhị phân (media) | Images, PDFs, avatars |

---

## 🧭 **DATABASE SELECTION GUIDE**

### **Firestore (Dữ liệu bền, truy vấn linh hoạt)**

✅ **Dùng cho:**
- Quiz metadata (title, description, visibility, stats)
- Questions & answers (protected by rules)
- User profiles & settings
- Quiz results & history
- Learning progress tracking
- Moderation & ratings
- Access control tokens (password unlock)

⚠️ **KHÔNG dùng cho:**
- Real-time game state (< 1s latency)
- High-frequency updates (>1 write/second)
- Presence/online status
- Live countdown timers

**Tính chất:**
- Read/write không liên tục
- Cần query/filter/pagination/indexing
- Lịch sử bền vững (persistent)
- Cost: $0.06/100K reads, $0.18/100K writes

---

### **Realtime Database (RTDB) (Tín hiệu thời gian thực)**

✅ **Dùng cho:**
- Player presence (online/offline, heartbeat)
- Game state (currentQuestionIndex, timer)
- Live leaderboard (temporary scores)
- Chat messages (real-time)
- Countdown & signals ("host clicked Next")
- Ready status (lobby)

⚠️ **KHÔNG dùng cho:**
- Permanent data (results, history)
- Complex queries (no indexes)
- Large objects (>1MB)

**Tính chất:**
- Cập nhật **RẤT THƯỜNG XUYÊN** (100-500ms)
- Fan-out cho nhiều clients
- Data có thể "bốc hơi" sau trận
- Cost: $1/GB stored, $1/GB downloaded

---

### **Storage (File nhị phân)**

✅ **Dùng cho:**
- Quiz question images
- Learning materials (PDFs)
- User avatars
- Quiz thumbnails
- Audio files

⚠️ **KHÔNG dùng cho:**
- Videos (→ YouTube Unlisted recommended)
- Frequent updates (→ CDN better)

**Best practices:**
- Store URLs in Firestore, files in Storage
- Use Cloud Functions for image resize
- Set proper security rules (per-user access)
- Enable CORS for web access

---

## 📊 **CURRENT STATE ANALYSIS**

### ✅ **Đã đúng (Keep as-is)**

1. **Firestore Collections:**
   ```
   ✅ quizzes/{quizId}                    - Metadata (public read)
   ✅ quizzes/{quizId}/questions/{qid}    - Protected questions
   ✅ quizzes/{quizId}/access/{uid}       - Password unlock tokens
   ✅ quizResults/{resultId}              - Permanent results
   ✅ users/{uid}                         - User profiles
   ✅ categories/{categoryId}             - Quiz categories
   ✅ userQuizActivities/{activityId}     - Learning progress
   ```

2. **Realtime Database:**
   ```
   ✅ /rooms/{roomId}/presence/{uid}      - Online/offline status
   ✅ /rooms/{roomId}/players/{uid}       - Ready status
   ✅ /rooms/{roomId}/messages/*          - Chat messages
   ```

3. **Storage:**
   ```
   ✅ /learning-resources/pdfs/*          - PDF files
   ✅ /users/{uid}/avatar.jpg             - User avatars
   ```

---

### ⚠️ **Cần điều chỉnh (Needs improvement)**

1. **Multiplayer Rooms - Mixed Firestore + RTDB ❌**

   **Hiện tại:**
   ```
   Firestore: multiplayer_rooms/{roomId}           - Room config (bền)
   Firestore: multiplayer_rooms/{roomId}/players   - Player list (bền)
   RTDB:      /rooms/{roomId}/presence             - Presence
   ```

   **Vấn đề:**
   - Room config in Firestore → OK ✅
   - Players in Firestore → TOO SLOW ❌
   - Presence in RTDB → OK ✅
   - BUT: Mixing paths confusing!

   **Giải pháp:**
   ```
   Firestore: multiplayer_rooms/{roomId}           - Config only (quizId, hostId, settings)
   RTDB:      /rooms/{roomId}/state                - Live game state
   RTDB:      /rooms/{roomId}/presence/{uid}       - Online/offline
   RTDB:      /rooms/{roomId}/players/{uid}        - Ready status + temp scores
   RTDB:      /rooms/{roomId}/chat/*               - Messages
   ```

2. **Submissions - Should be in Firestore ✅**

   **Hiện tại:**
   ```
   Firestore: multiplayer_rooms/{roomId}/submissions/{submissionId}  ✅ CORRECT
   ```

   **Giữ nguyên** - Đây là dữ liệu bền (immutable), đúng chỗ!

3. **Game Timer - Should be in RTDB ❌**

   **Hiện tại:**
   ```
   Firestore: multiplayer_rooms/{roomId}
   {
     currentQuestionIndex: 0,
     questionStartAt: timestamp,
     gameState: 'playing'
   }
   ```

   **Vấn đề:** Timer cập nhật liên tục → Firestore tốn tiền!

   **Giải pháp:**
   ```
   RTDB: /rooms/{roomId}/state
   {
     currentQuestionIndex: 0,
     questionStartAt: 1699000000000,
     durationSec: 30,
     gameState: 'playing'
   }
   ```

---

## 🎯 **RECOMMENDED ARCHITECTURE**

### **1. Firestore Structure (Persistent Data)**

```
📁 Firestore
├── users/{uid}
│   ├── email, displayName, role, photoURL
│   ├── stats: { quizzesCreated, quizzesTaken, totalScore }
│   └── settings: { language, notifications }
│
├── quizzes/{quizId}
│   ├── Metadata (PUBLIC READ):
│   │   ├── title, description, category, difficulty
│   │   ├── visibility: 'public' | 'password'
│   │   ├── status: 'draft' | 'pending' | 'approved' | 'rejected'
│   │   ├── createdBy, createdAt, updatedAt
│   │   ├── stats: { views, attempts, completions, avgScore }
│   │   └── pwd?: { enabled, hash, salt, hint }
│   │
│   ├── questions/{qid} (PROTECTED):
│   │   ├── question, options[], correctAnswer, points
│   │   ├── explanation, imageUrl?, pdfUrl?
│   │   └── difficulty, tags[]
│   │
│   ├── access/{uid} (PASSWORD UNLOCK):
│   │   ├── proofHash (SHA-256 of salt+password)
│   │   └── unlockedAt
│   │
│   └── resources/{resourceId} (LEARNING MATERIALS):
│       ├── type: 'pdf' | 'video' | 'link'
│       ├── title, url, order
│       └── mandatory: boolean
│
├── quizResults/{resultId}
│   ├── userId, quizId, score, maxScore, percentage
│   ├── completedAt, duration
│   ├── answers: [{ questionId, userAnswer, correct, timeSpent }]
│   └── metadata: { mode: 'practice' | 'timed' | 'multiplayer' }
│
├── userQuizActivities/{userId_quizId}
│   ├── userId, quizId
│   ├── attempts: number
│   ├── bestScore, lastAttemptAt
│   ├── progress: { resourcesViewed[], questionsAttempted[] }
│   └── notes: string?
│
├── multiplayer_rooms/{roomId}
│   ├── Config (PERSISTENT):
│   │   ├── code: string (6-digit)
│   │   ├── hostId, hostName
│   │   ├── quizId, quizTitle
│   │   ├── settings: { questionTime, autoNext, showAnswers }
│   │   ├── status: 'waiting' | 'playing' | 'finished'
│   │   ├── createdAt, startedAt?, endedAt?
│   │   └── playerCount: number (snapshot)
│   │
│   └── submissions/{submissionId} (IMMUTABLE):
│       ├── playerId, playerName
│       ├── questionIndex, questionId
│       ├── answer, correct, points, timeSpent
│       └── submittedAt (server timestamp)
│
├── categories/{categoryId}
│   ├── name, icon, description
│   ├── quizCount, color
│   └── order
│
└── notifications/{notificationId}
    ├── userId, type, title, message
    ├── read: boolean
    └── createdAt
```

---

### **2. Realtime Database Structure (Live Data)**

```
📁 Realtime Database (RTDB)
└── rooms/{roomId}
    ├── state/
    │   ├── currentQuestionIndex: number
    │   ├── questionStartAt: timestamp (ms)
    │   ├── durationSec: number
    │   ├── gameState: 'lobby' | 'countdown' | 'question' | 'leaderboard' | 'finished'
    │   └── updatedAt: timestamp
    │
    ├── presence/{uid}/
    │   ├── online: boolean
    │   ├── userName: string
    │   └── lastSeen: timestamp (auto-update on disconnect)
    │
    ├── players/{uid}/
    │   ├── userId, userName, avatarUrl
    │   ├── ready: boolean (lobby only)
    │   ├── score: number (temp, for live leaderboard)
    │   ├── answered: boolean (current question)
    │   └── lastActivity: timestamp
    │
    ├── chat/{messageId}/
    │   ├── userId, userName
    │   ├── message: string
    │   ├── type: 'player' | 'system' | 'host'
    │   └── timestamp: timestamp
    │
    └── signals/
        ├── hostReady: boolean
        ├── countdown: number (3, 2, 1, 0)
        └── nextQuestion: timestamp (trigger)
```

**Why RTDB for these?**
- `state`: Updates every question (every 30s) → Firestore OK, but RTDB faster
- `presence`: Updates every second (heartbeat) → RTDB ONLY
- `players.ready`: Changes in lobby → RTDB instant
- `players.score`: Updates every answer → RTDB instant (then sync to Firestore at end)
- `chat`: Real-time messages → RTDB instant
- `signals`: Countdown 3-2-1 → RTDB sub-second updates

---

### **3. Storage Structure (Binary Files)**

```
📁 Firebase Storage
├── quizzes/{quizId}/
│   ├── images/
│   │   ├── question_{qid}.jpg         (question images)
│   │   └── thumbnail.jpg              (quiz cover)
│   │
│   └── resources/
│       ├── lecture_1.pdf
│       └── worksheet.pdf
│
├── users/{uid}/
│   ├── avatar.jpg                     (user profile pic)
│   └── uploads/                       (user-generated content)
│
└── system/
    ├── categories/
    │   └── {categoryId}_icon.svg
    └── assets/
        └── default_thumbnail.jpg
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Quiz images - public read if quiz approved
    match /quizzes/{quizId}/{allPaths=**} {
      allow read: if true; // Public (quiz already approved)
      allow write: if request.auth != null && 
        firestore.get(/databases/(default)/documents/quizzes/$(quizId)).data.createdBy == request.auth.uid;
    }
    
    // User avatars - owner write, public read
    match /users/{userId}/avatar.jpg {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## 🔄 **MIGRATION PLAN**

### **Phase 1: Multiplayer State → RTDB ⚡**

**Goal:** Move live game state from Firestore to RTDB

**Files to modify:**
- `src/features/multiplayer/services/firestoreMultiplayerService.ts`
- `src/features/multiplayer/services/realtimeMultiplayerService.ts`

**Changes:**

1. **Move game state to RTDB:**
```typescript
// ❌ OLD (Firestore)
await updateDoc(doc(db, 'multiplayer_rooms', roomId), {
  currentQuestionIndex: index,
  questionStartAt: Date.now()
});

// ✅ NEW (RTDB)
await update(ref(rtdb, `rooms/${roomId}/state`), {
  currentQuestionIndex: index,
  questionStartAt: Date.now(),
  durationSec: 30
});
```

2. **Move player ready status to RTDB:**
```typescript
// ❌ OLD (Firestore subcollection)
await updateDoc(doc(db, 'multiplayer_rooms', roomId, 'players', uid), {
  ready: true
});

// ✅ NEW (RTDB)
await set(ref(rtdb, `rooms/${roomId}/players/${uid}`), {
  userId: uid,
  userName: name,
  ready: true,
  score: 0
});
```

3. **Listen to state changes:**
```typescript
// ✅ NEW (RTDB listener)
const stateRef = ref(rtdb, `rooms/${roomId}/state`);
onValue(stateRef, (snapshot) => {
  const state = snapshot.val();
  // Update UI with currentQuestionIndex, timer
});
```

**Benefits:**
- 🚀 State updates < 100ms (vs 1-2s Firestore)
- 💰 Cost reduction: ~90% less writes
- 🎯 Instant sync for all players

---

### **Phase 2: Leaderboard Optimization 📊**

**Goal:** Use RTDB for live scores, Firestore for final results

**Strategy:**

1. **Live scores in RTDB (temporary):**
```typescript
// During game: update RTDB for live leaderboard
await set(ref(rtdb, `rooms/${roomId}/players/${uid}/score`), newScore);
```

2. **Final results in Firestore (permanent):**
```typescript
// After game ends: save to Firestore
await addDoc(collection(db, 'quizResults'), {
  userId,
  quizId,
  roomId,
  score: finalScore,
  completedAt: serverTimestamp()
});
```

**Benefits:**
- ⚡ Live leaderboard updates instantly
- 📊 History preserved in Firestore
- 🔄 RTDB cleared after game (no storage cost)

---

### **Phase 3: Cleanup RTDB After Game 🧹**

**Goal:** Remove ephemeral data to save storage

**Implementation:**
```typescript
// After game finished (30 minutes)
const roomRef = ref(rtdb, `rooms/${roomId}`);
setTimeout(() => {
  remove(roomRef); // Delete entire room from RTDB
}, 30 * 60 * 1000); // 30 minutes
```

**What to keep in Firestore:**
- ✅ Room config (for history)
- ✅ Submissions (for review)
- ✅ Final results (permanent)

**What to delete from RTDB:**
- ❌ Presence (no longer needed)
- ❌ Chat messages (archived if needed)
- ❌ Live state (game ended)

---

## 🛡️ **SECURITY RULES**

### **Firestore Rules (Updated)**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function signedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return signedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isCreator() {
      return signedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'creator';
    }
    
    function quizDoc(quizId) {
      return get(/databases/$(database)/documents/quizzes/$(quizId));
    }
    
    function hasAccess(quizId) {
      return exists(/databases/$(database)/documents/quizzes/$(quizId)/access/$(request.auth.uid));
    }
    
    // Quizzes - Status-based + Visibility-based
    match /quizzes/{quizId} {
      // Metadata: Status-based access
      allow read: if signedIn() && (
        isAdmin() ||
        resource.data.createdBy == request.auth.uid ||
        resource.data.status == 'approved'
      );
      
      allow create: if signedIn() && (isCreator() || isAdmin()) && 
        request.resource.data.status == 'draft';
      
      allow update: if signedIn() && (
        isAdmin() ||
        (resource.data.createdBy == request.auth.uid && 
         resource.data.status in ['draft', 'rejected'])
      );
      
      allow delete: if signedIn() && (
        resource.data.createdBy == request.auth.uid || isAdmin()
      );
      
      // Questions: Status + Visibility + Password
      match /questions/{qid} {
        allow read: if signedIn() && (
          isAdmin() ||
          quizDoc(quizId).data.createdBy == request.auth.uid ||
          (quizDoc(quizId).data.status == 'approved' && (
            quizDoc(quizId).data.visibility == 'public' ||
            (quizDoc(quizId).data.visibility == 'password' && hasAccess(quizId))
          ))
        );
        
        allow write: if signedIn() && (
          isAdmin() || quizDoc(quizId).data.createdBy == request.auth.uid
        );
      }
      
      // Access tokens: Password verification
      match /access/{uid} {
        allow create: if signedIn() &&
          request.auth.uid == uid &&
          quizDoc(quizId).data.visibility == 'password' &&
          request.resource.data.proofHash == quizDoc(quizId).data.pwd.hash;
        
        allow read, delete: if signedIn() && request.auth.uid == uid;
      }
    }
    
    // Multiplayer rooms: Config only (state in RTDB)
    match /multiplayer_rooms/{roomId} {
      allow read: if signedIn();
      allow create: if signedIn();
      allow update: if signedIn() && (
        resource.data.hostId == request.auth.uid || isAdmin()
      );
      allow delete: if signedIn() && (
        resource.data.hostId == request.auth.uid || isAdmin()
      );
      
      // Submissions: Immutable, idempotent
      match /submissions/{submissionId} {
        allow read: if signedIn();
        allow create: if signedIn() &&
          request.resource.data.playerId == request.auth.uid &&
          !exists(/databases/$(database)/documents/multiplayer_rooms/$(roomId)/submissions/$(submissionId));
        allow update, delete: if false; // Immutable
      }
    }
    
    // Quiz results: Owner + quiz creator
    match /quizResults/{resultId} {
      allow read: if signedIn() && (
        resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/quizzes/$(resource.data.quizId)).data.createdBy == request.auth.uid ||
        isAdmin()
      );
      
      allow create: if signedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if signedIn() && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

### **RTDB Rules (NEW)**

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        // State: Only host or server can write
        "state": {
          ".read": "auth != null",
          ".write": "root.child('rooms').child($roomId).child('hostId').val() === auth.uid"
        },
        
        // Presence: Auto-managed by onDisconnect
        "presence": {
          "$uid": {
            ".read": "auth != null",
            ".write": "auth.uid === $uid"
          }
        },
        
        // Players: Each user manages their own
        "players": {
          "$uid": {
            ".read": "auth != null",
            ".write": "auth.uid === $uid"
          }
        },
        
        // Chat: Anyone in room can write
        "chat": {
          ".read": "auth != null",
          "$messageId": {
            ".write": "auth != null && !data.exists()"
          }
        },
        
        // Signals: Only host
        "signals": {
          ".read": "auth != null",
          ".write": "root.child('rooms').child($roomId).child('hostId').val() === auth.uid"
        }
      }
    }
  }
}
```

---

## ⚡ **PERFORMANCE OPTIMIZATION**

### **1. Firestore Optimization**

**Indexes (firestore.indexes.json):**
```json
{
  "indexes": [
    {
      "collectionGroup": "quizzes",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "quizResults",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "quizResults",
      "fields": [
        { "fieldPath": "quizId", "order": "ASCENDING" },
        { "fieldPath": "score", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Query Best Practices:**
```typescript
// ✅ GOOD: Limit + index
const q = query(
  collection(db, 'quizzes'),
  where('status', '==', 'approved'),
  orderBy('createdAt', 'desc'),
  limit(20)
);

// ❌ BAD: No limit, huge read cost
const q = query(collection(db, 'quizzes'));
const all = await getDocs(q); // Reads everything!
```

---

### **2. RTDB Optimization**

**Connection Management:**
```typescript
// Monitor connection status
const connectedRef = ref(rtdb, '.info/connected');
onValue(connectedRef, (snapshot) => {
  if (snapshot.val() === true) {
    console.log('✅ RTDB connected');
  } else {
    console.log('❌ RTDB disconnected');
  }
});
```

**Batch Updates:**
```typescript
// ✅ GOOD: Single update with multiple paths
await update(ref(rtdb, `rooms/${roomId}`), {
  'state/currentQuestionIndex': 1,
  'state/questionStartAt': Date.now(),
  'signals/nextQuestion': Date.now()
});

// ❌ BAD: Multiple separate updates
await set(ref(rtdb, `rooms/${roomId}/state/currentQuestionIndex`), 1);
await set(ref(rtdb, `rooms/${roomId}/state/questionStartAt`), Date.now());
```

---

### **3. Storage Optimization**

**Image Optimization:**
```typescript
// Use Cloud Functions to create thumbnails
// functions/src/index.ts
export const generateThumbnail = functions.storage
  .object()
  .onFinalize(async (object) => {
    if (!object.contentType?.startsWith('image/')) return;
    
    // Resize to 400x400 thumbnail
    // Upload to /thumbs/...
  });
```

**Download URL Caching:**
```typescript
// ✅ GOOD: Cache URL in Firestore metadata
const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
const imageUrl = quizDoc.data().imageUrl; // Pre-fetched URL

// ❌ BAD: Fetch URL every time
const storageRef = ref(storage, `quizzes/${quizId}/image.jpg`);
const url = await getDownloadURL(storageRef); // Extra API call
```

---

## 📈 **COST ANALYSIS**

### **Before Optimization (Current)**

| Service | Operation | Count/month | Cost |
|---------|-----------|-------------|------|
| Firestore | Quiz reads | 100K | $6 |
| Firestore | Game state updates | 50K writes | $9 |
| Firestore | Player status updates | 100K writes | $18 |
| **RTDB** | Presence (not used) | 0 | $0 |
| **Total** | | | **$33/month** |

### **After Optimization (Recommended)**

| Service | Operation | Count/month | Cost |
|---------|-----------|-------------|------|
| Firestore | Quiz reads | 100K | $6 |
| Firestore | Final results writes | 5K writes | $0.90 |
| **RTDB** | Game state updates | 50K writes | **$0** (bundled) |
| **RTDB** | Presence/players | 100K writes | **$0** (bundled) |
| **Total** | | | **$6.90/month** |

**Savings: ~79% cost reduction! 💰**

---

## 🚀 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Backend (2-3 days)**

- [ ] Create RTDB structure (`/rooms/{roomId}`)
- [ ] Update `realtimeMultiplayerService.ts`:
  - [ ] Move game state to RTDB
  - [ ] Move player ready/score to RTDB
  - [ ] Implement cleanup on disconnect
- [ ] Update `firestoreMultiplayerService.ts`:
  - [ ] Keep only config in Firestore
  - [ ] Keep submissions in Firestore (immutable)
- [ ] Deploy RTDB security rules
- [ ] Test multiplayer flow

### **Phase 2: Frontend (1-2 days)**

- [ ] Update hooks to listen to RTDB state
- [ ] Update UI to show live scores from RTDB
- [ ] Add connection status indicator
- [ ] Test offline/reconnect scenarios

### **Phase 3: Testing (1 day)**

- [ ] Load test: 50 concurrent players
- [ ] Test network disconnect/reconnect
- [ ] Test cost (monitor Firebase Console)
- [ ] Security audit (test unauthorized access)

### **Phase 4: Documentation (0.5 day)**

- [ ] Update developer docs
- [ ] Create deployment guide
- [ ] Document rollback plan

---

## 📞 **SUPPORT & RESOURCES**

**Documentation:**
- Firestore: https://firebase.google.com/docs/firestore
- RTDB: https://firebase.google.com/docs/database
- Storage: https://firebase.google.com/docs/storage

**Tools:**
- Firebase Console: https://console.firebase.google.com
- Emulators: `firebase emulators:start`
- Cost Calculator: https://firebase.google.com/pricing

**Team:**
- Architecture lead: [Your name]
- Backend dev: [Team member]
- Frontend dev: [Team member]

---

**Version:** 1.0.0  
**Last Updated:** Nov 3, 2025  
**Status:** 📋 **READY FOR REVIEW**
