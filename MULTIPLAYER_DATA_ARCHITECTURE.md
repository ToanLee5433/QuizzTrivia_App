# 🎮 Multiplayer Data Architecture

## Overview
The multiplayer system uses **3 Firebase services** with clear separation of concerns for optimal performance and real-time experience.

---

## 📊 Data Storage Strategy

### 1. **Firestore** (Primary Storage)
**Purpose**: Persistent data storage, room metadata, quiz data

**Collections**:
```
/multiplayer_rooms/{roomId}
  - id: string
  - code: string (6-char room code)
  - name: string
  - players: Player[] (array of player objects)
  - maxPlayers: number
  - isPrivate: boolean
  - password?: string (hashed)
  - status: 'waiting' | 'starting' | 'playing' | 'finished'
  - quizId?: string
  - quiz?: QuizData
  - settings: {
      timeLimit: number
      timePerQuestion?: number
      showLeaderboard: boolean
      allowLateJoin: boolean
    }
  - createdAt: Timestamp
  - startedAt?: Timestamp
  - finishedAt?: Timestamp

/multiplayer_rooms/{roomId}/gameData/{sessionId}
  - currentQuestionIndex: number
  - questions: Question[]
  - phase: 'question' | 'results' | 'finished'
  - questionStartAt?: Timestamp
  - questionEndAt?: Timestamp
  - startTime: Timestamp
  - endTime?: Timestamp
  - results: {
      [playerId]: {
        score: number
        correctAnswers: number
        totalAnswers: number
        averageTime: number
      }
    }
```

**Used For**:
- ✅ Room creation/deletion
- ✅ Room discovery (public rooms list)
- ✅ Quiz data loading
- ✅ Game session persistence
- ✅ Final results storage
- ✅ Player join/leave (with validation)

**Service**: `firestoreMultiplayerService.ts`

---

### 2. **Realtime Database** (RTDB) (Real-time Sync)
**Purpose**: Instant synchronization, presence, live updates

**Structure**:
```
/rooms/{roomId}/
  /presence/{userId}
    - isOnline: boolean
    - username: string
    - lastSeen: number (timestamp)
  
  /ready/{userId}
    - isReady: boolean
    - timestamp: number
  
  /countdown/
    - count: number
    - isActive: boolean
    - startedAt: number
  
  /gameStatus/
    - status: string
    - timestamp: number
  
  /answers/{userId}/
    - questionId: string
    - selectedAnswer: number
    - timestamp: number
  
  /messages/{messageId}
    - userId: string
    - username: string
    - message: string
    - timestamp: number
    - type: 'user' | 'system'
```

**Used For**:
- ✅ Player presence (online/offline detection)
- ✅ Ready status toggle (instant feedback)
- ✅ Game countdown timer (5-4-3-2-1 start)
- ✅ Answer submissions (real-time progress)
- ✅ Chat messages (instant messaging)
- ✅ Game status changes (waiting → starting → playing)

**Features**:
- `onDisconnect()` - Auto mark offline when connection lost
- Sub-second latency
- Optimized for frequent updates
- Ephemeral data (cleared on game end)

**Service**: `realtimeMultiplayerService.ts`

---

### 3. **Storage** (File Storage)
**Purpose**: Media files, user uploads

**Paths**:
```
/quizzes/{quizId}/
  /images/{imageId}
    - Question images
    - Answer option images
  
  /resources/{resourceId}
    - PDF documents
    - Videos
    - Audio files
  
/multiplayer/{roomId}/
  /screenshots/{timestamp}
    - Game screenshots (optional)
  
  /exports/{timestamp}
    - Exported results (CSV/JSON)
```

**Used For**:
- ✅ Quiz images (questions, answers)
- ✅ Learning materials (PDFs, videos)
- ✅ User avatars (future feature)
- ✅ Result exports

**Access**:
- Configured via `storage.rules`
- Public read for quiz assets
- Authenticated write for uploads

---

## 🔄 Data Flow

### Room Creation Flow:
```
1. User clicks "Create Room"
   ↓
2. Firestore: Create room document
   ↓
3. RTDB: Setup presence for creator
   ↓
4. Firestore: Listen to room updates
   ↓
5. RTDB: Listen to real-time events
```

### Player Join Flow:
```
1. User enters room code
   ↓
2. Firestore: Query room by code
   ↓
3. Firestore: Validate (max players, password)
   ↓
4. Firestore: Add player to players array
   ↓
5. RTDB: Setup presence
   ↓
6. RTDB: Listen to ready/countdown/chat
```

### Game Start Flow:
```
1. All players ready
   ↓
2. RTDB: Start countdown (5s)
   ↓
3. Firestore: Load quiz questions
   ↓
4. RTDB: Set status = 'starting'
   ↓
5. Countdown reaches 0
   ↓
6. Firestore: Create game session
   ↓
7. RTDB: Set status = 'playing'
   ↓
8. Navigate to game page
```

### Answer Submission Flow:
```
1. Player selects answer
   ↓
2. RTDB: Store answer instantly (for progress bar)
   ↓
3. Firestore: Store answer with validation
   ↓
4. Calculate points
   ↓
5. Update player score in Firestore
```

### Chat Message Flow:
```
1. User types message
   ↓
2. RTDB: Write to /messages/{messageId}
   ↓
3. RealtimeChat component: onValue listener
   ↓
4. Display message instantly (<100ms)
```

---

## ⚡ Performance Optimizations

### Why This Architecture?

1. **Firestore for Persistence**
   - Complex queries (room discovery)
   - Data integrity (transactions)
   - Structured data (nested collections)
   - Cost-effective for reads

2. **RTDB for Real-time**
   - Sub-100ms latency
   - Presence detection
   - Small, frequent updates
   - Connection state events

3. **Storage for Files**
   - Optimized for large files
   - CDN delivery
   - Automatic scaling
   - Cost per GB stored

### Data Lifecycle:

```
Room Created (Firestore)
  ↓
Players Join (Firestore + RTDB presence)
  ↓
Ready/Chat/Countdown (RTDB only)
  ↓
Game Starts (Firestore game session)
  ↓
Answers (RTDB instant + Firestore validation)
  ↓
Game Ends (Firestore results)
  ↓
RTDB data cleared (optional)
  ↓
Room deleted after 24h (Firestore)
```

---

## 🔐 Security Rules

### Firestore Rules (`firestore.rules`):
```javascript
match /multiplayer_rooms/{roomId} {
  // Anyone can read public rooms
  allow read: if resource.data.isPrivate == false;
  
  // Authenticated users can create rooms
  allow create: if request.auth != null;
  
  // Only players in room can update
  allow update: if request.auth != null 
    && request.auth.uid in resource.data.players;
  
  // Room creator can delete
  allow delete: if request.auth != null;
}
```

### RTDB Rules (`database.rules.json`):
```json
{
  "rooms": {
    "$roomId": {
      "presence": {
        "$userId": {
          ".read": true,
          ".write": "$userId === auth.uid",
          ".validate": "newData.hasChildren(['isOnline', 'username', 'lastSeen'])"
        }
      },
      "ready": {
        "$userId": {
          ".read": true,
          ".write": "$userId === auth.uid"
        }
      },
      "messages": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
}
```

### Storage Rules (`storage.rules`):
```
match /quizzes/{quizId}/{allPaths=**} {
  allow read: if true;  // Public quiz assets
  allow write: if request.auth != null;
}

match /multiplayer/{roomId}/{allPaths=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

---

## 📈 Monitoring & Cleanup

### Automatic Cleanup:
- **RTDB**: Data cleared when last player leaves
- **Firestore**: Rooms auto-deleted after 24h inactivity
- **Storage**: Orphaned files cleaned monthly

### Monitoring Points:
- Active rooms count
- Average game duration
- Chat message volume
- Connection stability
- Answer submission latency

---

## 🚀 Future Enhancements

1. **Spectator Mode** (RTDB only)
2. **Voice Chat** (WebRTC + Storage for recordings)
3. **Replay System** (Firestore + Storage)
4. **Tournament Brackets** (Firestore)
5. **Live Leaderboard** (RTDB)

---

## 📝 Key Files

- `firestoreMultiplayerService.ts` - Main service (Firestore operations)
- `realtimeMultiplayerService.ts` - Real-time sync (RTDB operations)
- `MultiplayerManager.tsx` - Component orchestration
- `RealtimeChat.tsx` - Chat component (RTDB messages)
- `RoomLobby.tsx` - Lobby UI (RTDB countdown/ready)

---

## 🎯 Summary

| Feature | Firestore | RTDB | Storage |
|---------|-----------|------|---------|
| Room Metadata | ✅ Primary | ❌ | ❌ |
| Player List | ✅ Source of truth | ✅ Presence sync | ❌ |
| Chat | ❌ | ✅ Real-time | ❌ |
| Ready Status | ✅ Backup | ✅ Primary | ❌ |
| Countdown | ❌ | ✅ Only | ❌ |
| Quiz Data | ✅ Only | ❌ | ❌ |
| Answers | ✅ Validation | ✅ Progress | ❌ |
| Results | ✅ Persistent | ❌ | ✅ Exports |
| Images | ❌ | ❌ | ✅ Only |
| Game Sessions | ✅ History | ❌ | ❌ |

**Design Principle**: Use the right tool for the job!
- Firestore = Data integrity & persistence
- RTDB = Speed & real-time sync
- Storage = Files & media

