# 🔥 Firestore Cost Optimization - Multiplayer

## Tổng quan

Đã tối ưu hóa chi phí Firestore bằng cách giảm số lượng writes trong luồng multiplayer game.

**Nguyên tắc: Firestore = Storage for Results, Not Process**

## 📊 So sánh TRƯỚC/SAU

### Trước đây (Chi phí cao)
```
Tạo phòng:
- 1 write (room metadata)
- 1 write (host player trong Firestore players subcollection)  ❌

Mỗi người chơi join:
- 1 write (player trong Firestore players subcollection)  ❌

Mỗi tin nhắn chat:
- 1 write (message trong Firestore messages subcollection)  ❌

Mỗi người submit kết quả:
- 1 write (submission trong Firestore submissions subcollection)  ❌

Kết thúc game (N người chơi):
- N writes (player data vào Firestore players)  ❌

TỔNG CHO 1 GAME (8 người, 10 tin nhắn):
= 1 + 1 + 7 + 10 + 8 + 8 = 35 writes
```

### Sau tối ưu (Chi phí thấp)
```
Tạo phòng:
- 1 write (room metadata)
- 0 writes (RTDB only cho players)  ✅

Mỗi người chơi join:
- 0 writes (RTDB only)  ✅

Mỗi tin nhắn chat:
- 0 writes (RTDB only)  ✅

Mỗi người submit kết quả:
- 0 writes (chỉ log, không ghi Firestore)  ✅

Kết thúc game (N người chơi):
- 1 write (match_histories với TẤT CẢ kết quả)  ✅

TỔNG CHO 1 GAME (8 người, 10 tin nhắn):
= 1 + 1 = 2 writes
```

### 📉 Giảm: 94.3% (35 → 2 writes)

## 🔄 Các thay đổi thực hiện

### 1. Loại bỏ Firestore players subcollection (createRoom)
**File:** `modernMultiplayerService.ts` - `createRoom()`

**Trước:**
```typescript
// Ghi cả RTDB lẫn Firestore
await set(playerRef, playerData);
await setDoc(firestorePlayerRef, playerData);  // ❌ XÓA
```

**Sau:**
```typescript
// Chỉ ghi RTDB, Firestore chỉ dùng cho results
await set(playerRef, playerData);
// ✅ Firestore write đã xóa - chỉ ghi vào RTDB
```

### 2. Thay Firestore messages bằng RTDB chat (3 vị trí)
**File:** `modernMultiplayerService.ts`

**Trước:**
```typescript
const messagesRef = collection(this.db, 'multiplayer_rooms', roomId, 'messages');
addDoc(messagesRef, { ... });  // ❌ Firestore write mỗi tin nhắn
```

**Sau:**
```typescript
const chatMessagesRef = ref(this.rtdb, `rooms/${roomId}/chat/messages`);
push(chatMessagesRef, { ... });  // ✅ RTDB - miễn phí
```

**Vị trí đã sửa:**
- `leaveRoom()` - khi host rời phòng
- `kickPlayer()` - khi kick người chơi
- `transferHost()` - khi chuyển host

### 3. Tạo collection match_histories (endGame)
**File:** `modernMultiplayerService.ts` - `endGame()`

**Trước:**
```typescript
// Ghi N documents vào players subcollection
const batch = writeBatch(this.db);
for (const [playerId, playerData] of Object.entries(players)) {
  batch.set(firestorePlayerRef, { ... });  // ❌ N writes
}
await batch.commit();
```

**Sau:**
```typescript
// Ghi 1 document chứa TẤT CẢ kết quả
const matchHistory = {
  roomId, roomCode, roomName, hostId,
  quizId, quizTitle, totalQuestions,
  leaderboard: [...],  // Tất cả người chơi
  startedAt, finishedAt, duration,
  playerCount, winner
};
await setDoc(doc(this.db, 'match_histories', roomId), matchHistory);  // ✅ 1 write
```

### 4. Xóa Firestore write trong saveGameSubmission
**File:** `modernMultiplayerService.ts` - `saveGameSubmission()`

**Trước:**
```typescript
await addDoc(submissionsRef, { ... });  // ❌ Firestore write
```

**Sau:**
```typescript
// ✅ Chỉ log, không ghi Firestore
// Kết quả đã được lưu trong match_histories bởi endGame()
logger.info('📊 Game submission recorded (in-memory)', { ... });
```

### 5. Cập nhật getUserGameHistory và getRoomGameHistory
**File:** `modernMultiplayerService.ts`

**Trước:**
```typescript
// Đọc từ submissions subcollection
const submissionsQuery = query(
  collectionGroup(this.db, 'submissions'),
  ...
);
```

**Sau:**
```typescript
// Đọc từ match_histories collection
const historyQuery = query(
  collection(this.db, 'match_histories'),
  ...
);
```

## 📁 Cấu trúc match_histories

```typescript
// Collection: match_histories/{roomId}
{
  roomId: "abc123",
  roomCode: "ABC123",
  roomName: "Quiz Night",
  hostId: "user123",
  
  // Quiz info
  quizId: "quiz456",
  quizTitle: "General Knowledge",
  totalQuestions: 10,
  
  // Game settings
  gameMode: "synced",
  timePerQuestion: 30,
  
  // Results - TẤT CẢ người chơi trong 1 array
  leaderboard: [
    {
      rank: 1,
      oderId: "user123",
      name: "Player 1",
      score: 850,
      correctAnswers: 8,
      totalAnswers: 10,
      accuracy: 80,
      photoURL: "...",
      role: "host"
    },
    // ... tất cả người chơi khác
  ],
  
  // Timestamps
  startedAt: 1234567890000,
  finishedAt: Timestamp,
  duration: 180000,  // ms
  
  // Stats
  playerCount: 8,
  winner: {
    playerId: "user123",
    name: "Player 1",
    score: 850
  }
}
```

## 🔒 Firestore Rules

Đã cập nhật rules cho `match_histories` và đánh dấu các subcollection cũ là DEPRECATED:

```javascript
/* ===== Match Histories (GAME RESULTS) ===== */
match /match_histories/{matchId} {
  // Bất kỳ user nào cũng có thể đọc lịch sử
  allow read: if signedIn();
  
  // Chỉ host mới có thể ghi (khi game kết thúc)
  allow create: if signedIn() &&
    request.resource.data.hostId == request.auth.uid &&
    request.resource.data.roomId == matchId &&
    request.resource.data.leaderboard is list &&
    request.resource.data.finishedAt != null;
  
  // Immutable sau khi tạo
  allow update, delete: if false;
}

/* ===== Players Subcollection (DEPRECATED) ===== */
match /players/{playerId} {
  allow read: if signedIn();
  // ❌ NO NEW WRITES - players are in RTDB now
  allow create, update, delete: if false;
}

/* ===== Messages Subcollection (DEPRECATED) ===== */
match /messages/{messageId} {
  allow read: if signedIn();
  // ❌ NO NEW WRITES - messages are in RTDB now
  allow create, update, delete: if false;
}

/* ===== Submissions Subcollection (DEPRECATED) ===== */
match /submissions/{submissionId} {
  allow read: if signedIn();
  // ❌ NO NEW WRITES - use match_histories instead
  allow create, update, delete: if false;
}
```

## 🔥 RTDB Rules

Đã cập nhật để hỗ trợ system messages trong chat:

```json
"chat": {
  "messages": {
    "$messageId": {
      ".write": "auth != null",
      ".validate": "(newData.child('type').val() == 'system' || newData.child('senderId').val() == 'system') || (newData.child('userId').val() == auth.uid ...)",
      // Hỗ trợ cả user messages và system messages
      "senderId": { ".validate": "!newData.exists() || newData.isString()" },
      "senderName": { ".validate": "!newData.exists() || newData.isString()" },
      "content": { ".validate": "!newData.exists() || ..." },
      "type": { ".validate": "... 'user' || 'system' || 'announcement'" }
    }
  }
}
```

## 🧹 Các import đã cleanup

```typescript
// Đã xóa (không còn dùng)
- writeBatch
- collectionGroup

// Đã thêm (cho RTDB chat)
+ push
```

## 📈 Lợi ích

1. **Giảm 94%+ chi phí Firestore writes** cho multiplayer
2. **Tăng tốc độ** - RTDB nhanh hơn Firestore cho real-time
3. **Dễ query** - 1 document chứa tất cả thay vì N documents
4. **Dễ backup** - match_histories là snapshot hoàn chỉnh
5. **Backward compatible** - submissions cũ vẫn đọc được

## ⚠️ Lưu ý khi deploy

1. **Deploy cả Firestore VÀ RTDB rules**:
   ```bash
   firebase deploy --only firestore:rules,database
   ```

2. **Dữ liệu cũ** trong players/messages/submissions subcollection vẫn được giữ lại và có thể đọc

3. **Không thể ghi mới** vào các subcollection deprecated

## 📁 Files đã thay đổi

- `src/features/multiplayer/modern/services/modernMultiplayerService.ts`
- `firestore.rules` - Thêm match_histories, deprecated players/messages/submissions
- `database.rules.json` - Hỗ trợ system messages trong chat
